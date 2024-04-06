import React, {useMemo, useState} from 'react';
import {observer} from "mobx-react";
import {Autocomplete, Box, Button, Modal, Stack, TextField, Typography} from "@mui/material";
import {GroupSnapshotIn} from "../../models/Group/GroupModel";
import {User} from "../../models/User/UserModel";
import {DataGrid, GridColDef, GridRenderCellParams} from "@mui/x-data-grid";
import {useApiService} from "../../hooks";
import {Member, MemberSnapshotIn} from "../../models/User/MemberModel";
import LockResetIcon from '@mui/icons-material/LockReset';
import {ConfirmModal} from "./ConfirmModal";
import {Group as MlsGroup, Identity, Provider} from "../../utils/crypto/openmls";
import {useStores} from "../../models/helpers/useStores";
import {runInAction} from "mobx";

export type EditGroupModalProps = {
    isOpen: boolean;
    handleClose: () => void;
    group: GroupSnapshotIn
    me: User
    handleAddUser: (member: MemberSnapshotIn, group: GroupSnapshotIn) => Promise<boolean>
    handleRemoveUser: (member: MemberSnapshotIn, group: GroupSnapshotIn) => Promise<boolean>
    handleLeaveGroup: (group: GroupSnapshotIn) => Promise<boolean>
};

export const EditGroupModal = observer(function EditGroupModal(props: EditGroupModalProps) {
    const apiService = useApiService()

    const {userStore, groupStore} = useStores()

    const [foundUsers, setFoundUsers] = useState<MemberSnapshotIn[] | undefined>()
    const [selectedUser, setSelectedUser] = useState<MemberSnapshotIn | null>(null);

    const [isRefreshKeyModalOpen, setIsRefreshKeyModalOpen] = useState<boolean>(false)

    const [isLeaveGroupModalOpen, setIsLeaveGroupModalOpen] = useState<boolean>(false)
    const [isRemoveUserFromGroupModalOpen, setIsRemoveUserFromGroupModalOpen] = useState<boolean>(false)

    const [userToRemove, setUserToRemove] = useState<MemberSnapshotIn | null>(null);

    const findUsers = async (event: React.SyntheticEvent<Element, Event>, value: string) => {
        if (value.trim()) {
            const users = await apiService.getUsersByEmail({email: value})
            const filteredUsers = users.filter(user =>
                !props.group.users?.some(groupUser => groupUser.email === user.email)
            );

            setFoundUsers(filteredUsers);
        }
    }

    const memoizedFoundUsers = useMemo(() => {
        return foundUsers || [];
    }, [foundUsers]);

    const handleAddButtonClick = async () => {
        if (selectedUser) {
            await props.handleAddUser(selectedUser, props.group);
            setSelectedUser(null)
        }
    };

    const handleRemoveUserConfirmation = async () => {
        if(userToRemove) {
            const success = await props.handleRemoveUser(userToRemove, props.group);
            if(success) {
                // Optionally close the modal and reset state here
                setIsRemoveUserFromGroupModalOpen(false);
                setUserToRemove(null);
            }
            // Handle failure or additional logic here
        }
    };


    const closeModal = () => {
        props.handleClose();
        setTimeout(() => {
            setFoundUsers(undefined)
            setSelectedUser(null)
        }, 300); // Delay to allow modal close animation
    };

    const rotateGroupKey = async () => {
        try {
            const provider = Provider.deserialize(userStore.me.keyStore)
            const identity = Identity.deserialize(provider, userStore.me.serializedIdentity);

            const deserializedGroup = MlsGroup.deserialize(props.group.serializedGroup);

            const updateKeyMessage = deserializedGroup.update_key_package(provider, identity)

            try {
                await apiService.postGeneralCommitMessage({
                    groupId: props.group.groupId,
                    message: updateKeyMessage.commit.toString(),
                    epoch: props.group.epoch
                })
            } catch (error) {
                console.error("Failed to leave group", error);
                return false;
            }

            deserializedGroup.merge_pending_commit(provider)

            const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(userStore.me.keyStore)})
            await apiService.updateKeyStore({keyStore: keyStoreToUpdate})
            runInAction(() => {
                userStore.me.setKeyStore(keyStoreToUpdate)
            });

            let updateSerializedUserGroupResponse;
            try {
                updateSerializedUserGroupResponse = await apiService.updateSerializedUserGroup({
                    serializedUserGroupId: props.group.serializedUserGroupId,
                    serializedUserGroup: deserializedGroup.serialize(),
                    epoch: props.group.epoch + 1,
                });
            } catch (error) {
                console.error("Failed to update serialized user group", error);
                return false;
            }

            groupStore.updateGroup(updateSerializedUserGroupResponse);
            return true
        } catch (error) {
            console.error("Unexpected error while removing user ", error);
            return false;
        }
    }


    const style = {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
    };

    const columns: GridColDef[] = [
        {
            field: 'user',
            headerName: 'Uživatel',
            flex: 1,
            minWidth: 100,
            renderCell: (params: GridRenderCellParams<Member>) => (
                <Box sx={{display: 'flex', alignItems: 'center', height: '100%'}}>
                    <Typography variant="body2">{params.value.email}</Typography>
                </Box>
            )
            ,
        },
        {
            field: 'action',
            headerName: 'Akce',
            width: 150,
            renderCell: (params: GridRenderCellParams<Member>) => (
                params.value.email === props.group?.creator.email ?
                    <Button variant="outlined" disabled color="error">Zakázáno</Button> :
                    params.value.email === props.me.email ?
                        <Button variant="outlined" onClick={() => setIsLeaveGroupModalOpen(true)}
                                color="error">Opustit</Button> :
                        <Button variant="outlined" onClick={() => {
                            setUserToRemove(params.value); // Store the user for removal
                            setIsRemoveUserFromGroupModalOpen(true); // Open the confirmation modal
                        }}
                                color="error">Odebrat</Button>
            ),
        }
    ];

    const rows = props.group?.users?.map(user => ({
        id: user.email,
        user: user,
        action: user // The whole user object is passed for rendering logic in the `action` column
    })) || [];

    return (
        <Modal
            open={props.isOpen}
            onClose={closeModal}
        >
            <>
                <ConfirmModal
                    isOpen={isRefreshKeyModalOpen}
                    handleClose={() => setIsRefreshKeyModalOpen(false)}
                    handleSubmit={() => rotateGroupKey()}
                    title="Aktualizovat skupinový klíč"
                    text="Pokud máte pochyby, zda nedošlo ke kompromitaci skupiný nebo vašeho klíče ve skupině, vygenerujte nový!"
                    confirmText="Vygenerovat"
                    successMessage="Klíč aktualizován"
                />
                <ConfirmModal
                    isOpen={isLeaveGroupModalOpen}
                    handleClose={() => setIsLeaveGroupModalOpen(false)}
                    handleSubmit={() => props.handleLeaveGroup(props.group)}
                    title="Opustit skupinu"
                    text="Opravdu checete opsutit skupinu? Nebude znovu možné se do ní přidat! Pokud se budete chtít do skupiny znovu přidat, požádejte jiného člena o odebrání."
                    confirmText="Opustit"
                    successMessage="Skupina opuštěna"
                />
                <ConfirmModal
                    isOpen={isRemoveUserFromGroupModalOpen}
                    handleClose={() => setIsRemoveUserFromGroupModalOpen(false)}
                    handleSubmit={handleRemoveUserConfirmation} // HERE IS THE INCOMPLETE FUNCTINO CALL
                    title="Odebrat uživatele"
                    text="Jste si jisti, že chcete uživatele odebrat? Bude možné ho následně znovu přidat!"
                    confirmText="Odebrat"
                    successMessage="Uživatel odebrán"
                />
                <Box sx={style}>
                    <Typography id="modal-modal-title" variant="h6" component="h2">
                        Editovat skupinu
                    </Typography>
                    <Stack spacing={2} direction="row" paddingY={5}>
                        <Autocomplete
                            disablePortal
                            options={memoizedFoundUsers}
                            getOptionLabel={(option) => option.email || ""}
                            noOptionsText={"Zadejte email uživatele"}
                            onInputChange={findUsers}
                            onChange={(event, value: MemberSnapshotIn | null) => setSelectedUser(value)}
                            value={selectedUser}
                            isOptionEqualToValue={(option, value) => option.email === value.email}
                            sx={{width: 300}}
                            renderInput={(params) => <TextField {...params} label="Vyhledat uživate"/>}
                        />
                        <Button variant="contained" onClick={handleAddButtonClick}>Přidat</Button>
                    </Stack>
                    <Box style={{height: 400, width: '100%'}}>
                        <DataGrid
                            disableColumnSelector
                            rows={rows}
                            columns={columns}
                        />
                    </Box>

                    <Box display="flex" justifyContent="space-between" mt={2}>
                        <Button variant="outlined" onClick={closeModal}>Zrušit</Button>
                        <Button variant="outlined" startIcon={<LockResetIcon/>}
                                onClick={() => setIsRefreshKeyModalOpen(true)}>
                            Přegenerovat skupinový klíč
                        </Button>
                    </Box>

                </Box>
            </>
        </Modal>
    );
});
