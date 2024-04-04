import React, {useMemo, useState} from 'react';
import {observer} from "mobx-react";
import {Autocomplete, Box, Button, Modal, Stack, TextField, Typography} from "@mui/material";
import {GroupSnapshotIn} from "../models/MLS/GroupModel";
import {User} from "../models/User/UserModel";
import {DataGrid, GridColDef, GridRenderCellParams} from "@mui/x-data-grid";
import {useApiService} from "../hooks";
import {Member, MemberSnapshotIn} from "../models/User/MemberModel";

export type EditGroupModalProps = {
    isOpen: boolean;
    handleClose: () => void;
    group: GroupSnapshotIn
    me: User
    handleAddUser: (member: MemberSnapshotIn, group: GroupSnapshotIn) => Promise<boolean>
    handleRemoveUser: (member: MemberSnapshotIn, group: GroupSnapshotIn) => Promise<boolean>
};

export const EditGroupModal = observer(function EditGroupModal(props: EditGroupModalProps) {
    const apiService = useApiService()

    const [foundUsers, setFoundUsers] = useState<MemberSnapshotIn[] | undefined>()
    const [selectedUser, setSelectedUser] = useState<MemberSnapshotIn | null>(null);
    const findUsers = async (event: React.SyntheticEvent<Element, Event>, value: string) => {
        if (value.trim()) {
            const users = await apiService.getUsersByEmail({email: value})
            const filteredUsers = users.filter(user =>
                !props.group.users?.some(groupUser => groupUser.email === user.email)
            );

            setFoundUsers(filteredUsers);        }
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

    const closeModal = () => {
        props.handleClose();
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
                params.value.email === props.group?.creator.email ?
                    <Button variant="outlined" disabled color="error">Zakázáno</Button> :
                    params.value.email === props.me.email ?
                        <Button variant="outlined" color="error">Opustit</Button> :
                        <Button variant="outlined" onClick={()=>props.handleRemoveUser(params.value, props.group)} color="error">Odebrat</Button>
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
                </Box>
            </Box>
        </Modal>
    );
});
