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
import {applySnapshot, getSnapshot} from "mobx-state-tree";
import {action} from "mobx";
import {CreateGroupModal, EditGroupModal} from "../Components";
import {createGroupDefaultModel, Group, GroupSnapshotIn} from "../models/MLS/GroupModel";
import {MemberSnapshotIn} from "../models/User/MemberModel";
import {GetGroupsToJoin} from "../services/api";

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
        const groups = await apiService.getGroupCollection()
        applySnapshot(groupStore.groups, groups)

    }

    const createGroup = async (name: string) => {
        try {
            const provider = Provider.deserialize(userStore.me.keyStore);
            const identity = Identity.deserialize(provider, userStore.me.serializedIdentity);

            const group = MlsGroup.create_new(provider, identity, name);
            const serializedGroup = group.serialize();
            const serializedRatchetTree = group.export_ratchet_tree().serialize()

            const createGroupResponse = await apiService.createGroup(
                {
                    name: name,
                    serializedGroup: serializedGroup,
                    ratchetTree: serializedRatchetTree
                }
            );

            action("updateGroupStore", () => {
                groupStore.createNew(createGroupResponse);
            })();

            provider.free();
            identity.free();
            group.free();

            return "Group successfully created.";
        } catch (error) {
            console.error("Failed to create group:", error);
            throw new Error("Failed to create group.");
        }
    };

    const joinGroups = async () => {

        console.log("join groups")
        const groupsToJoin: GetGroupsToJoin = await apiService.getGroupsToJoin()

        const provider = Provider.deserialize(userStore.me.keyStore);
        const identity = Identity.deserialize(provider, userStore.me.serializedIdentity)


        for (const group of groupsToJoin.welcomeMessages) {
            const groupToJoin = MlsGroup.join(provider, stringToUint8Array(group.message), RatchetTree.deserialize(group.ratchetTree))

            console.log(group.welcomeMessageId)

            const persistedSerializedUserGroup = await apiService.createSerializedUserGroupAfterJoin({
                groupId: group.groupId,
                serializedUserGroup: groupToJoin.serialize(),
                epoch: group.epoch,
                welcomeMessageId: group.welcomeMessageId
            })

            groupStore.createNew(persistedSerializedUserGroup)

            //TODO Post na novou serialized group a pak ten response pridat do groupStore

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

            try {
                await apiService.createWelcomeMessage({
                    welcomeMessage: add_msg.welcome.toString(),
                    commitMessage: add_msg.commit.toString(),
                    memberId: member.id,
                    groupId: group.groupId
                });
            } catch (error) {
                console.error("Failed to create welcome message", error);
                return false;
            }

            try {
                await apiService.updateRatchetTree({
                    groupId: group.groupId,
                    ratchetTree: deserializedGroup.export_ratchet_tree().serialize()
                });
            } catch (error) {
                console.error("Failed to update ratchet tree", error);
                return false;
            }

            let updateSerializedUserGroupResponse;
            try {
                updateSerializedUserGroupResponse = await apiService.updateSerializedUserGroup({
                    serializedUserGroupId: group.serializedUserGroupId,
                    serializedUserGroup: deserializedGroup.serialize()
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
            console.error("Unexpected error in addUser function", error);
            return false;
        }
    }

    useEffect(() => {
        const initializeWasm = async () => {
            await __wbg_init();
        }
        if (!isWasmInitialized) {
            initializeWasm().then(() => {
                if (!initialLoadDone) {
                    joinGroups();
                    loadGroups();
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