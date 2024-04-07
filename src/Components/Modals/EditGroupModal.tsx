import React, {useMemo, useState} from 'react';
import {observer} from "mobx-react";
import {Autocomplete, Box, Button, IconButton, Modal, Stack, TextField, Typography} from "@mui/material";
import {User} from "../../models/User/UserModel";
import {DataGrid, GridColDef, GridRenderCellParams} from "@mui/x-data-grid";
import {useApiService} from "../../hooks";
import {Member, MemberSnapshotIn} from "../../models/User/MemberModel";
import LockResetIcon from '@mui/icons-material/LockReset';
import {ConfirmModal} from "./ConfirmModal";
import {Group as MlsGroup, Identity, Provider} from "../../utils/crypto/openmls";
import {useStores} from "../../models/helpers/useStores";
import {runInAction} from "mobx";
import CloseIcon from "@mui/icons-material/Close";

export type EditGroupModalProps = {
    isOpen: boolean;
    onHandleClose: () => void;
    groupIndex: number;
    me: User
    onHandleAddUser: (member: MemberSnapshotIn, groupIndex: number) => Promise<boolean>
    onHandleRemoveUser: (member: MemberSnapshotIn, groupIndex: number) => Promise<boolean>
    onHandleLeaveGroup: (groupIndex: number) => Promise<boolean>
    onFeedback: (type: 'success' | 'error', message: string) => void;
    onHandleGroupDelete: (groupIndex: number) => Promise<void>
    onRotateGroupKey: (groupIndex: number)=>Promise<void>
};

export const EditGroupModal = observer(function EditGroupModal(props: EditGroupModalProps) {
    const apiService = useApiService()

    const {userStore, groupStore} = useStores()

    const [foundUsers, setFoundUsers] = useState<MemberSnapshotIn[] | undefined>()
    const [selectedUser, setSelectedUser] = useState<MemberSnapshotIn | null>(null);

    const [isRefreshKeyModalOpen, setIsRefreshKeyModalOpen] = useState<boolean>(false)

    const [isLeaveGroupModalOpen, setIsLeaveGroupModalOpen] = useState<boolean>(false)
    const [isRemoveUserFromGroupModalOpen, setIsRemoveUserFromGroupModalOpen] = useState<boolean>(false)
    const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState<boolean>(false)

    const [userToRemove, setUserToRemove] = useState<MemberSnapshotIn | null>(null);

    const findUsers = async (event: React.SyntheticEvent<Element, Event>, value: string) => {
        if (value.trim()) {
            const users = await apiService.getUsersByEmail({email: value})
            const filteredUsers = users.filter(user =>
                !groupStore.groups[props.groupIndex].users?.some(groupUser => groupUser.email === user.email)
            );

            setFoundUsers(filteredUsers);
        }
    }

    const memoizedFoundUsers = useMemo(() => {
        return foundUsers || [];
    }, [foundUsers]);

    const handleAddButtonClick = async () => {
        if (selectedUser) {
            await props.onHandleAddUser(selectedUser, props.groupIndex);
            setSelectedUser(null)
        }
    };

    const handleRemoveUserConfirmation = async () => {
        if (userToRemove) {
            try{
                await props.onHandleRemoveUser(userToRemove, props.groupIndex);
                setIsRemoveUserFromGroupModalOpen(false);
                setUserToRemove(null);
            }catch {
                props.onFeedback("error", "Něco se nepovedlo")
            }
        }
    };
    const handleGroupDelete = async () => {
        try {
            await props.onHandleGroupDelete(props.groupIndex);
            closeModal()
        }catch {
            props.onFeedback("error", "Něco se nepovedlo")
        }
    };


    const closeModal = () => {
        props.onHandleClose();
        setTimeout(() => {
            setFoundUsers(undefined)
            setSelectedUser(null)
        }, 300); // Delay to allow modal close animation
    };



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
                params.value.email === groupStore.groups[props.groupIndex]?.creator.email ?
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

    const rows = groupStore.groups[props.groupIndex]?.users?.map(user => ({
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
                    onHandleClose={() => setIsRefreshKeyModalOpen(false)}
                    onHandleSubmit={() => props.onRotateGroupKey(props.groupIndex)}
                    title="Aktualizovat skupinový klíč"
                    text="Pokud máte pochyby, zda nedošlo ke kompromitaci skupiny nebo vašeho klíče ve skupině, vygenerujte nový!"
                    confirmText="Vygenerovat"
                    successMessage="Klíč aktualizován"
                    onFeedback={props.onFeedback}
                />
                <ConfirmModal
                    isOpen={isLeaveGroupModalOpen}
                    onHandleClose={() => setIsLeaveGroupModalOpen(false)}
                    onHandleSubmit={() => props.onHandleLeaveGroup(props.groupIndex)}
                    title="Opustit skupinu"
                    text="Opravdu checete opsutit skupinu? Nebude znovu možné se do ní přidat! Pokud se budete chtít do skupiny znovu přidat, požádejte jiného člena o odebrání."
                    confirmText="Opustit"
                    successMessage="Skupina opuštěna"
                    onFeedback={props.onFeedback}
                />
                <ConfirmModal
                    isOpen={isRemoveUserFromGroupModalOpen}
                    onHandleClose={() => setIsRemoveUserFromGroupModalOpen(false)}
                    onHandleSubmit={handleRemoveUserConfirmation}
                    title="Odebrat uživatele"
                    text="Jste si jisti, že chcete uživatele odebrat? Bude možné ho následně znovu přidat!"
                    confirmText="Odebrat"
                    successMessage="Uživatel odebrán"
                    onFeedback={props.onFeedback}
                />
                <ConfirmModal
                    isOpen={isDeleteGroupModalOpen}
                    onHandleClose={() => setIsDeleteGroupModalOpen(false)}
                    onHandleSubmit={handleGroupDelete}
                    title="Smazat skupinu"
                    text="Jste si jisti, že chcete skupinu smazat?"
                    confirmText="Smazat"
                    successMessage="Skupina smazána"
                    onFeedback={props.onFeedback}
                />
                <Box sx={style}>
                    <IconButton sx={{position: "fixed", top: 5, right: 5}} onClick={closeModal}>
                        <CloseIcon/>
                    </IconButton>
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
                        <Button variant="outlined" startIcon={<LockResetIcon/>}
                                onClick={() => setIsRefreshKeyModalOpen(true)}>
                            Přegenerovat skupinový klíč
                        </Button>
                        {userStore.me.email === groupStore.groups[props.groupIndex]?.creator.email &&
                            <Button variant="contained" color="error"
                                    onClick={() => setIsDeleteGroupModalOpen(true)}>
                                Smazat skupinu
                            </Button>
                        }
                    </Box>

                </Box>
            </>
        </Modal>
    );
});
