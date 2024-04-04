import React, {useEffect, useState} from 'react';
import {observer} from "mobx-react";
import {useStores} from "../models/helpers/useStores";
import {useApiService} from "../hooks";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
    Box,
    Card,
    CardContent,
    Container,
    Divider,
    Drawer,
    Grid,
    IconButton,
    List,
    ListItem,
    SpeedDial,
    SpeedDialAction,
    SpeedDialIcon,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme
} from "@mui/material";
import {DataGrid, GridColDef, GridRenderCellParams} from "@mui/x-data-grid";
import CreditCardIcon from '@mui/icons-material/CreditCard';
import KeyIcon from '@mui/icons-material/Key';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import {useDrawer} from "../context/DrawerContext";
import __wbg_init, {Group as MlsGroup, Identity, KeyPackage, Provider, RatchetTree} from "../utils/crypto/openmls";
import {applySnapshot} from "mobx-state-tree";
import {runInAction} from "mobx";
import {CreateGroupModal, EditGroupModal} from "../Components";
import {GroupSnapshotIn} from "../models/MLS/GroupModel";
import {MemberSnapshotIn} from "../models/User/MemberModel";

export const Home = observer(function Home() {
    const {userStore, groupStore} = useStores()
    const [isWasmInitialized, setWasmInitialized] = useState<boolean>(false);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const apiService = useApiService()
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const {isDrawerOpen, toggleDrawer} = useDrawer();

    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState<boolean>(false)
    const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState<boolean>(false)

    const [editedGroup, setEditedGroup] = useState<GroupSnapshotIn>({
        groupId: "",
        serializedUserGroupId: "",
        creator: {id: "", email: "", keyPackage: ""},
        name: '',
        serializedGroup: '',
        lastEpoch: 1,
        epoch: 1,
    })

    function stringToUint8Array(inputString: string): Uint8Array {
        const numberArray = inputString.split(',').map(Number);
        return new Uint8Array(numberArray);
    }

    const loadGroups = async () => {
        try {
            const groups = await apiService.getGroupCollection()
            applySnapshot(groupStore.groups, groups)
        } catch (error) {
            console.error("Unexpected error in while loading groups", error);
            return false;
        }
    }

    const createGroup = async (name: string) => {
        try {
            const provider = Provider.deserialize(userStore.me.keyStore);
            const identity = Identity.deserialize(provider, userStore.me.serializedIdentity);

            const group = MlsGroup.create_new(provider, identity, name);
            const serializedGroup = group.serialize();
            const ratchetTree = group.export_ratchet_tree()
            const serializedRatchetTree = ratchetTree.serialize()

            const createGroupResponse = await apiService.createGroup(
                {
                    name: name,
                    serializedGroup: serializedGroup,
                    ratchetTree: serializedRatchetTree
                }
            );

            const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(userStore.me.keyStore)})
            await apiService.updateKeyStore({keyStore: keyStoreToUpdate})
            runInAction(() => {
                userStore.me.setKeyStore(keyStoreToUpdate)
            });

            runInAction(() => {
                groupStore.createNew(createGroupResponse);
            });

            provider.free();
            identity.free();
            ratchetTree.free()
            group.free();

            return "Group successfully created.";
        } catch (error) {
            console.error("Failed to create group:", error);
            throw new Error("Failed to create group.");
        }
    };

    const joinGroups = async () => {
        try {
            const groupsToJoin: {
                welcomeMessageId: string,
                id: string,
                groupId: string,
                message: string,
                ratchetTree: string,
                epoch: string
            }[] = (await apiService.getGroupsToJoin()).welcomeMessages

            const provider = Provider.deserialize(userStore.me.keyStore);


            for (const group of groupsToJoin) {


                const groupToJoin = MlsGroup.join(provider, stringToUint8Array(group.message), RatchetTree.deserialize(group.ratchetTree))

                const persistedSerializedUserGroup = await apiService.createSerializedUserGroupAfterJoin({
                    groupId: group.groupId,
                    serializedUserGroup: groupToJoin.serialize(),
                    epoch: group.epoch,
                    welcomeMessageId: group.welcomeMessageId
                })

                groupStore.createNew(persistedSerializedUserGroup)

                groupToJoin.free()

            }

            const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(userStore.me.keyStore)})
            await apiService.updateKeyStore({keyStore: keyStoreToUpdate})
            runInAction(() => {
                userStore.me.setKeyStore(keyStoreToUpdate)
            });


            provider.free()
        } catch (error) {
            console.error("Unexpected error while joining group", error);
            return false;
        }
    }

    const addUser = async (member: MemberSnapshotIn, group: GroupSnapshotIn) => {
        try {
            const provider = Provider.deserialize(userStore.me.keyStore);
            const identity = Identity.deserialize(provider, userStore.me.serializedIdentity);

            const deserializedGroup = MlsGroup.deserialize(group.serializedGroup);

            const deserializedKeyPackage = KeyPackage.deserialize(member.keyPackage)

            const add_msg = deserializedGroup.add_member(
                provider,
                identity,
                deserializedKeyPackage
            );

            deserializedGroup.merge_pending_commit(provider)

            const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(userStore.me.keyStore)})
            await apiService.updateKeyStore({keyStore: keyStoreToUpdate})
            runInAction(() => {
                userStore.me.setKeyStore(keyStoreToUpdate)
            });

            const ratchetTree = deserializedGroup.export_ratchet_tree()
            const serializedRatchetTree = ratchetTree.serialize()

            try {
                await apiService.createWelcomeMessage({
                    welcomeMessage: add_msg.welcome.toString(),
                    commitMessage: add_msg.commit.toString(),
                    memberId: member.id,
                    groupId: group.groupId,
                    ratchetTree: serializedRatchetTree,
                });
            } catch (error) {
                console.error("Failed to create welcome message", error);
                return false;
            }

            let updateSerializedUserGroupResponse;
            try {
                updateSerializedUserGroupResponse = await apiService.updateSerializedUserGroup({
                    serializedUserGroupId: group.serializedUserGroupId,
                    serializedUserGroup: deserializedGroup.serialize(),
                    epoch: group.epoch + 1,
                });
            } catch (error) {
                console.error("Failed to update serialized user group", error);
                return false;
            }

            setEditedGroup(groupStore.updateGroup(updateSerializedUserGroupResponse));


            provider.free();
            identity.free();
            deserializedGroup.free();
            deserializedKeyPackage.free()

            return true;
        } catch (error) {
            console.error("Unexpected error while adding user ", error);
            return false;
        }
    }

    const catchUpOnEpoch = async () => {
        try {
            const provider = Provider.deserialize(userStore.me.keyStore);

            for (const group of groupStore.groups) {
                const commitMessages: {
                    message: string;
                    epoch: number;
                }[] = (await apiService.getCommitMessages({groupId: group.groupId, epoch: group.lastEpoch})).messages

                if (commitMessages.length === 0) continue

                const deserializedGroup = MlsGroup.deserialize(group.serializedGroup);

                commitMessages.sort((a, b) => a.epoch - b.epoch);

                for (const commitMessage of commitMessages) {

                    deserializedGroup.process_message(provider, stringToUint8Array(commitMessage.message))

                    runInAction(() => {
                        group.setLastEpoch(commitMessage.epoch);
                    });
                }


                deserializedGroup.merge_pending_commit(provider)

                try {
                    const updateSerializedUserGroupResponse = await apiService.updateSerializedUserGroup({
                        serializedUserGroupId: group.serializedUserGroupId,
                        serializedUserGroup: deserializedGroup.serialize(),
                        epoch: group.lastEpoch,
                    });
                    groupStore.updateGroup(updateSerializedUserGroupResponse)
                } catch (error) {
                    console.error("Failed to update serialized user group", error);
                    return false;
                }

                deserializedGroup.free()
            }
            const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(userStore.me.keyStore)})
            await apiService.updateKeyStore({keyStore: keyStoreToUpdate})
            runInAction(() => {
                userStore.me.setKeyStore(keyStoreToUpdate)
            });

            provider.free()
        } catch (error) {
            console.error("Unexpected error while catching up on epoch", error);
            return false;
        }
    }

    const removeUser = async (member: MemberSnapshotIn, group: GroupSnapshotIn) => {
        try {
            const provider = Provider.deserialize(userStore.me.keyStore);
            const identity = Identity.deserialize(provider, userStore.me.serializedIdentity);

            const deserializedGroup = MlsGroup.deserialize(group.serializedGroup);

            const deserializedRemovedMemberKeyPackage = KeyPackage.deserialize(member.keyPackage)

            const removedMemberIndex = deserializedGroup.get_member_index(deserializedRemovedMemberKeyPackage)

            const deserializedKeyPackage = KeyPackage.deserialize(member.keyPackage)

            const add_msg = deserializedGroup.remove_member(
                provider,
                identity,
                removedMemberIndex
            );

            try {
                await apiService.removeUser({
                    message: add_msg.commit.toString(),
                    groupId: group.groupId,
                    userId: member.id,
                    epoch: group.epoch
                });
            } catch (error) {
                console.error("Failed to remove user", error);
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
                    serializedUserGroupId: group.serializedUserGroupId,
                    serializedUserGroup: deserializedGroup.serialize(),
                    epoch: group.epoch + 1,
                });
            } catch (error) {
                console.error("Failed to update serialized user group", error);
                return false;
            }

            setEditedGroup(groupStore.updateGroup(updateSerializedUserGroupResponse));


            provider.free();
            identity.free();
            deserializedGroup.free();
            deserializedKeyPackage.free()

            return true;
        } catch (error) {
            console.error("Unexpected error while removing user ", error);
            return false;
        }
    }
    const leaveGroup = async (group: GroupSnapshotIn) => {
        try {
            const provider = Provider.deserialize(userStore.me.keyStore);
            const identity = Identity.deserialize(provider, userStore.me.serializedIdentity);

            const deserializedGroup = MlsGroup.deserialize(group.serializedGroup);

            const leave_msg = deserializedGroup.leave(
                provider,
                identity
            );

            try {
                await apiService.leaveGroup({
                    message: leave_msg.commit.toString(),
                    groupId: group.groupId,
                    epoch: group.epoch
                });
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

            groupStore.removeGroup(group)

            setIsEditGroupModalOpen(false)

            provider.free();
            identity.free();
            deserializedGroup.free();

            return true;
        } catch (error) {
            console.error("Unexpected error while removing user ", error);
            return false;
        }
    }

    useEffect(() => {
        const initializeWasm = async () => {
            await __wbg_init();
        }
        if (!isWasmInitialized) {
            initializeWasm().then(async () => {
                const provider = Provider.deserialize(userStore.me.keyStore);

                if (!initialLoadDone) {
                    await joinGroups();
                    await loadGroups();
                    await catchUpOnEpoch();
                    groupStore.groups.forEach((group) => {
                        const deserializedgroup = MlsGroup.deserialize(group.serializedGroup)
                        console.log(deserializedgroup.export_key(provider, 'exported', new Uint8Array(32).fill(0x30),
                            32)
                        )
                        deserializedgroup.free()
                    })
                    setInitialLoadDone(true);
                }
            });
            setWasmInitialized(true);
        }
    }, [isWasmInitialized, initialLoadDone]);

    const groups = groupStore.groups.map((group) => {
        return {name: group.name, members: group.users.length}
    })

    const rows = [
        {id: 1, type: 'card', name: 'Firemní ČSOB'},
    ];

    const actions = [
        {icon: <KeyIcon/>, name: 'Přihlašovací údaje', onClick: () => console.log('prihl')},
        {icon: <CreditCardIcon/>, name: 'Karta', onClick: () => console.log('karta')},
        {icon: <InsertDriveFileIcon/>, name: 'Soubor', onClick: () => console.log('soubor')},
    ];

    const columns: GridColDef[] = [
        {
            field: 'type',
            headerName: 'Typ',
            align: "center",
            headerAlign: "center",
            width: 130,
            renderCell: (params: GridRenderCellParams) => {
                let icon;
                switch (params.value) {
                    case 'card':
                        icon = <Tooltip title={"Karta"}><CreditCardIcon/></Tooltip>;
                        break;
                    case 'login':
                        icon = <Tooltip title={"Přihlašovací údaje"}><KeyIcon/></Tooltip>;
                        break;
                    case 'file':
                        icon = <Tooltip title={"Soubor"}><InsertDriveFileIcon/></Tooltip>;
                        break;
                    default:
                        icon = <div/>;
                }
                return (
                    <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: "100%"}}>
                        {icon}
                    </Box>
                );
            }
        },
        {field: 'name', headerName: 'Název', width: 130, flex: 1},
        {
            field: 'details',
            headerName: 'Detail',
            sortable: false,
            renderCell: (params: GridRenderCellParams) => (
                <IconButton
                    onClick={() => console.log(params.id)}
                >
                    <MoreVertIcon/>
                </IconButton>
            ),
        },
    ];


    const listContent = (
        <>
            <CardContent sx={{backgroundColor: "#dddddd", height: 40}}>
                <Grid container>
                    <Grid item xs={10}>
                        <TextField id="outlined-search" label="Hledání" type="search" size={"small"}/>
                    </Grid>
                    <Grid item xs={1}>
                        <Tooltip title="Přidat skupinu">
                            <IconButton color="primary" aria-label="add to shopping cart" size="medium"
                                        onClick={() => setIsCreateGroupModalOpen(true)}>
                                <GroupAddIcon/>
                            </IconButton>
                        </Tooltip>
                    </Grid>
                </Grid>
            </CardContent>
            <CardContent>
                <List>
                    {groupStore.groups.map((group, index) => (
                        <React.Fragment key={index}>
                            <ListItem>
                                <Container>
                                    <Typography variant="body2">{group.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {group.users.length} členů
                                    </Typography>
                                </Container>
                                <IconButton onClick={() => {
                                    setEditedGroup(group)
                                    setIsEditGroupModalOpen(true)
                                }}>
                                    <MoreVertIcon/>
                                </IconButton>
                            </ListItem>
                            {index < groups.length - 1 && <Divider/>}
                        </React.Fragment>
                    ))}
                </List>
            </CardContent>
        </>
    );

    const conditionalPadding = isMobile ? 2 : 5; // Conditional padding based on screen size

    return (

        <>
            <CreateGroupModal
                isOpen={isCreateGroupModalOpen}
                handleClose={() => setIsCreateGroupModalOpen(false)}
                handleSubmit={createGroup}
            />
            <EditGroupModal
                isOpen={isEditGroupModalOpen}
                handleClose={() => setIsEditGroupModalOpen(false)}
                group={editedGroup}
                me={userStore.me}
                handleAddUser={addUser}
                handleRemoveUser={removeUser}
                handleLeaveGroup={leaveGroup}
            />
            <Box
                sx={{
                    padding: conditionalPadding,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Grid container spacing={2}>
                    {isMobile ? (
                        <>
                            <Drawer
                                variant="temporary"
                                open={isDrawerOpen}
                                onClose={() => toggleDrawer()}
                                ModalProps={{
                                    keepMounted: true, // Better open performance on mobile
                                }}
                                sx={{
                                    '& .MuiDrawer-paper': {width: 'auto', boxSizing: 'border-box'},
                                }}
                            >
                                {listContent}
                            </Drawer>
                        </>
                    ) : (
                        <Grid item xs={3}>
                            <Card sx={{minHeight: '85vh'}} elevation={3}>
                                {listContent}
                            </Card>
                        </Grid>
                    )}

                    <Grid item xs={isMobile ? 12 : 9}>
                        <Card sx={{height: '100%', width: '100%'}} elevation={3}>
                            <CardContent sx={{backgroundColor: "#dddddd", height: 40}}>
                                <SpeedDial
                                    direction={'right'}
                                    ariaLabel="profile"
                                    icon={<SpeedDialIcon/>}
                                    FabProps={{size: "small", style: {boxShadow: "none"}}}
                                    sx={{height: 40}}
                                >
                                    {actions.map((action) => (
                                        <SpeedDialAction
                                            key={action.name}
                                            icon={action.icon}
                                            tooltipTitle={action.name}
                                            onClick={action.onClick}
                                        />
                                    ))}
                                </SpeedDial>
                            </CardContent>
                            <DataGrid
                                sx={{borderWidth: 0}}
                                rows={rows}
                                columns={columns}
                                autoHeight
                                disableColumnMenu
                                disableRowSelectionOnClick
                            />
                        </Card>
                    </Grid>
                </Grid>
            </Box></>
    );
})

function compare_bytes(left: Uint8Array, right: Uint8Array) {
    if (left.length !== right.length) {
        return false
    }

    return left.every((value, index) => value === right[index])
}