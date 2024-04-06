import React, {useEffect, useState} from 'react';
import {observer} from "mobx-react";
import {useStores} from "../models/helpers/useStores";
import {useApiService} from "../hooks";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
    Alert,
    Box,
    Card,
    CardContent,
    Container,
    Divider,
    Drawer,
    Grid,
    IconButton,
    List,
    ListItem, ListItemButton, Snackbar,
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
import {applySnapshot, castToSnapshot} from "mobx-state-tree";
import {runInAction} from "mobx";
import {ConfirmModal, CreateGroupModal, EditGroupModal} from "../Components";
import {createGroupDefaultModel, GroupSnapshotIn} from "../models/Group/GroupModel";
import {MemberSnapshotIn} from "../models/User/MemberModel";
import {snapshotProcessor} from "mobx-state-tree/dist/types/utility-types/snapshotProcessor";
import {AddItemModal} from "../Components/Modals/AddItemModal";
import {GroupItemSnapshotIn} from "../models/GroupItem/GroupItemModel";

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
    const [isConfirmErrorUserAddModalOpen, setIsConfirmErrorUserAddModalOpen] = useState<boolean>(false)
    const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0)
    const [editedGroupIndex, setEditedGroupIndex] = useState<number>(0)
    const [isAddGroupItemModalOpen, setIsAddGroupItemModalOpen] = useState<boolean>(false)
    const [addItemType, setAddItemType] = useState<string>("")

    const [feedBack, setFeedback] = useState<{ type: "success" | "error", message: string } | null | undefined>()

    // string to Uint8Array
    function stringToUint8Array(inputString: string): Uint8Array {
        const numberArray = inputString.split(',').map(Number);
        return new Uint8Array(numberArray);
    }

    // Text to ArrayBuffer
    const str2ab = (str: string): ArrayBuffer => {
        const encoder = new TextEncoder();
        return encoder.encode(str);
    };

    // ArrayBuffer to base64 string
    const ab2base64 = (buffer: ArrayBuffer): string => {
        const array = Array.from(new Uint8Array(buffer));
        return btoa(String.fromCharCode(...array));
    };

    // Base64 string to ArrayBuffer
    const base64ab = (base64: string): ArrayBuffer => {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    };

    // ArrayBuffer to string
    const ab2str = (buffer: ArrayBuffer): string => {
        const decoder = new TextDecoder();
        return decoder.decode(buffer);
    };

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
            }[] = await apiService.getGroupsToJoin()

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

    const addUser = async (member: MemberSnapshotIn, groupIndex: number) => {
        try {
            const provider = Provider.deserialize(userStore.me.keyStore);
            const identity = Identity.deserialize(provider, userStore.me.serializedIdentity);

            const deserializedGroup = MlsGroup.deserialize(groupStore.groups[groupIndex].serializedGroup);

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
                    groupId: groupStore.groups[groupIndex].groupId,
                    ratchetTree: serializedRatchetTree,
                });
            } catch (error) {
                console.error("Failed to create welcome message", error);
                return false;
            }

            let updateSerializedUserGroupResponse;
            try {
                updateSerializedUserGroupResponse = await apiService.updateSerializedUserGroup({
                    serializedUserGroupId: groupStore.groups[groupIndex].serializedUserGroupId,
                    serializedUserGroup: deserializedGroup.serialize(),
                    epoch: groupStore.groups[groupIndex].epoch + 1,
                });
            } catch (error) {
                console.error("Failed to update serialized user group", error);
                return false;
            }

            setEditedGroupIndex(groupStore.updateGroup(updateSerializedUserGroupResponse));


            provider.free();
            identity.free();
            deserializedGroup.free();
            deserializedKeyPackage.free()

            return true;
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes("Duplicate signature key in proposals and group")) {
                    setIsConfirmErrorUserAddModalOpen(true)
                    return false
                }
            }
            console.error("Unexpected error while adding user ", error);
            return false
        }
    }

    const catchUpOnEpoch = async () => {
        try {
            const provider = Provider.deserialize(userStore.me.keyStore);

            for (const group of groupStore.groups) {
                const commitMessages: {
                    message: string;
                    epoch: number;
                }[] = await apiService.getCommitMessages({groupId: group.groupId, epoch: group.lastEpoch})

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

    const removeUser = async (member: MemberSnapshotIn, groupIndex: number) => {
        try {
            const provider = Provider.deserialize(userStore.me.keyStore);
            const identity = Identity.deserialize(provider, userStore.me.serializedIdentity);

            const deserializedGroup = MlsGroup.deserialize(groupStore.groups[groupIndex].serializedGroup);

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
                    groupId: groupStore.groups[groupIndex].groupId,
                    userId: member.id,
                    epoch: groupStore.groups[groupIndex].epoch
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
                    serializedUserGroupId: groupStore.groups[groupIndex].serializedUserGroupId,
                    serializedUserGroup: deserializedGroup.serialize(),
                    epoch: groupStore.groups[groupIndex].epoch + 1,
                });
            } catch (error) {
                console.error("Failed to update serialized user group", error);
                return false;
            }

            setEditedGroupIndex(groupStore.updateGroup(updateSerializedUserGroupResponse));


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
    const leaveGroup = async (groupIndex: number) => {
        const provider = Provider.deserialize(userStore.me.keyStore);
        const identity = Identity.deserialize(provider, userStore.me.serializedIdentity);

        const deserializedGroup = MlsGroup.deserialize(groupStore.groups[groupIndex].serializedGroup);

        const leave_msg = deserializedGroup.leave(
            provider,
            identity
        );

        await apiService.leaveGroup({
            message: leave_msg.commit.toString(),
            groupId: groupStore.groups[groupIndex].groupId,
            epoch: groupStore.groups[groupIndex].epoch
        });

        deserializedGroup.merge_pending_commit(provider)

        const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(userStore.me.keyStore)})
        await apiService.updateKeyStore({keyStore: keyStoreToUpdate})
        runInAction(() => {
            userStore.me.setKeyStore(keyStoreToUpdate)
        });

        groupStore.removeGroup(groupIndex)

        setIsEditGroupModalOpen(false)

        provider.free();
        identity.free();
        deserializedGroup.free();

        return true;
    }

    const createNewGroupItem = async (groupIndex: number, groupItem: GroupItemSnapshotIn) => {

        const {ciphertext, iv} = await encryptData(groupIndex, groupItem.content)

        const response = await apiService.createNewGroupItem({
            groupId: groupStore.groups[groupIndex].groupId,
            name: groupItem.name,
            description: groupItem.description,
            content: ciphertext,
            type: groupItem.type,
            iv: iv,
        })

        runInAction(()=>{
            groupStore.addGroupItemToGroup(selectedGroupIndex, response)
        })

        return true
    }

    const encryptData = async (groupIndex: number, data: string):Promise<{ciphertext: string, iv: string}> => {

        const provider = Provider.deserialize(userStore.me.keyStore);

        const deserializedGroup = MlsGroup.deserialize(groupStore.groups[groupIndex].serializedGroup);

        const secret = deserializedGroup.export_key(
            provider,
            'encryptionKey',
            new Uint8Array(32).fill(0x30),
            32
        )

        const aesKey = await importAesKey(secret);

        const { ciphertext, iv } = await encryptStringWithAesCtr(data, aesKey);

        provider.free()
        deserializedGroup.free()

        return {ciphertext, iv}

    }

    const importAesKey = async (rawKey: Uint8Array): Promise<CryptoKey> => {
        return window.crypto.subtle.importKey(
            "raw", // Raw format of the key
            rawKey, // The key as Uint8Array
            {   // Algorithm details
                name: "AES-CTR"
            },
            false, // Whether the key is extractable (i.e., can be used in exportKey)
            ["encrypt", "decrypt"] // Key usages
        );
    };
    const encryptStringWithAesCtr = async (plaintext: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> => {
        const iv = window.crypto.getRandomValues(new Uint8Array(16));
        const encodedText = str2ab(plaintext);
        const encryptedData = await window.crypto.subtle.encrypt(
            {
                name: "AES-CTR",
                counter: iv,
                length: 128,
            },
            key,
            encodedText
        );
        return {
            ciphertext: ab2base64(encryptedData),
            iv: ab2base64(iv)
        };
    };

    const decryptStringWithAesCtr = async (ciphertext: string, key: CryptoKey, iv: string): Promise<string> => {
        const decryptedData = await window.crypto.subtle.decrypt(
            {
                name: "AES-CTR",
                counter: base64ab(iv), // The counter (IV) must be the same as the encryption
                length: 128,
            },
            key,
            base64ab(ciphertext)
        );
        return ab2str(decryptedData);
    };

    useEffect(() => {

        const loadGroupItems = async () => {
            const groupItems = await apiService.getGroupItems({groupId: groupStore.groups[selectedGroupIndex].groupId})

            runInAction(() => {
                groupStore.updateGroupItems(selectedGroupIndex, groupItems)
            });
        }
        if (isWasmInitialized && groupStore.groups[selectedGroupIndex].groupId !== '') {
            loadGroupItems()
        }
        // groupStore.updateGroup()
    }, [isWasmInitialized, groupStore, groupStore.groups[selectedGroupIndex]]);

    useEffect(() => {
        const initializeWasm = async () => {
            await __wbg_init();
        }
        if (!isWasmInitialized) {
            initializeWasm().then(async () => {
                // const provider = Provider.deserialize(userStore.me.keyStore);

                if (!initialLoadDone) {
                    await joinGroups();
                    await loadGroups();
                    await catchUpOnEpoch();
                    // groupStore.groups.forEach((group) => {
                    //     const deserializedgroup = MlsGroup.deserialize(group.serializedGroup)
                    //     console.log(deserializedgroup.export_key(provider, 'exported', new Uint8Array(32).fill(0x30),
                    //         32)
                    //     )
                    //     deserializedgroup.free()
                    // })
                    setInitialLoadDone(true);
                }
            });
            setWasmInitialized(true);
        }
    }, [isWasmInitialized, initialLoadDone]);


    const actions = [
        {
            icon: <KeyIcon/>, name: 'Přihlašovací údaje', onClick: () => {
                setAddItemType("login")
                setIsAddGroupItemModalOpen(true)
            }
        },
        {
            icon: <CreditCardIcon/>, name: 'Karta', onClick: () => {
                setAddItemType("card")
                setIsAddGroupItemModalOpen(true)
            }
        },
        // {icon: <InsertDriveFileIcon/>, name: 'Soubor', onClick: () => console.log('soubor')},
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
        {field: 'description', headerName: 'Popis', width: 130, flex: 1},
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
                        <React.Fragment key={group.groupId /* Use group.id instead of index for key if possible */}>
                            <ListItemButton
                                selected={groupStore.groups[selectedGroupIndex].groupId === group.groupId}
                                onClick={() => {
                                    setSelectedGroupIndex(groupStore.getGroupIndex(group))
                                }}
                            >
                                <Container>
                                    <Typography variant="body2">{group.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {group.users.length} členů
                                    </Typography>
                                </Container>
                                <IconButton onClick={(event) => {
                                    event.stopPropagation(); // Prevent ListItem click when IconButton is clicked
                                    setEditedGroupIndex(groupStore.getGroupIndex(group));
                                    setIsEditGroupModalOpen(true);
                                }}>
                                    <MoreVertIcon/>
                                </IconButton>
                            </ListItemButton>
                            {index < groupStore.groups.length - 1 && <Divider/>}
                        </React.Fragment>
                    ))}
                </List>
            </CardContent>
        </>
    );
    const conditionalPadding = isMobile ? 2 : 5; // Conditional padding based on screen size

    return (

        <>
            <ConfirmModal
                isOpen={isConfirmErrorUserAddModalOpen}
                handleClose={() => setIsConfirmErrorUserAddModalOpen(false)}
                handleSubmit={() => setIsConfirmErrorUserAddModalOpen(false)}
                title="Nelze přidat uživatele"
                text="Uživatel již jednou skupinu opustil. Není možné ho znovu přidat."
                successMessage=""
            />
            <CreateGroupModal
                isOpen={isCreateGroupModalOpen}
                handleClose={() => setIsCreateGroupModalOpen(false)}
                handleSubmit={createGroup}
                onFeedback={(type, message) => setFeedback({type, message})}
            />
            <EditGroupModal
                isOpen={isEditGroupModalOpen}
                handleClose={() => setIsEditGroupModalOpen(false)}
                groupIndex={editedGroupIndex}
                me={userStore.me}
                handleAddUser={addUser}
                handleRemoveUser={removeUser}
                handleLeaveGroup={leaveGroup}
            />
            <AddItemModal
                isOpen={isAddGroupItemModalOpen}
                handleClose={() => setIsAddGroupItemModalOpen(false)}
                groupIndex={selectedGroupIndex}
                onItemCreate={createNewGroupItem}
                type={addItemType}
                onFeedback={(type, message) => setFeedback({type, message})}
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
                            {groupStore.groups[selectedGroupIndex].groupId !== ""
                                ?
                                <Box
                                    height="100%"
                                    width="100%"
                                >
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
                                    {groupStore.groups[selectedGroupIndex].groupItems && groupStore.groups[selectedGroupIndex].groupItems.length > 0
                                        ?
                                        <DataGrid
                                            sx={{borderWidth: 0}}
                                            rows={groupStore.groups[selectedGroupIndex].groupItems?.map((groupItem) => {
                                                return {id: groupItem.id, type: groupItem.type, name: groupItem.name, description: groupItem.description}
                                            })}
                                            columns={columns}
                                            autoHeight
                                            disableColumnMenu
                                            disableRowSelectionOnClick
                                        />
                                        :
                                        <Box
                                            flexDirection="column"
                                            display="flex"
                                            justifyContent="center"
                                            alignItems="center"
                                            height="60%"
                                            width="100%"
                                        >
                                            <Typography height={50} variant="h6" color={theme.palette.grey["400"]}>Přidejte
                                                položky</Typography>
                                            <SpeedDial
                                                direction={'down'}
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
                                        </Box>
                                    }

                                </Box>
                                :
                                <Box
                                    display="flex"
                                    justifyContent="center"
                                    alignItems="center"
                                    height="60%"
                                    width="100%"
                                >
                                    <Typography variant="h6" color={theme.palette.grey["400"]}>Vyberte
                                        Skupinu</Typography>
                                </Box>

                            }

                        </Card>

                    </Grid>
                </Grid>
            </Box>
            <Snackbar open={!!feedBack} autoHideDuration={6000} onClose={() => setFeedback(null)}>
                <Alert onClose={() => setFeedback(null)} severity={feedBack?.type} sx={{width: '100%'}}>
                    {feedBack?.message}
                </Alert>
            </Snackbar>
        </>
    );
})

function compare_bytes(left: Uint8Array, right: Uint8Array) {
    if (left.length !== right.length) {
        return false
    }

    return left.every((value, index) => value === right[index])
}