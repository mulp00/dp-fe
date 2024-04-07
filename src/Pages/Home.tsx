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
    ListItemButton,
    Snackbar,
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
import {runInAction} from "mobx";
import {ConfirmModal, CreateGroupModal, EditGroupModal, ItemDetailModal} from "../Components";
import {MemberSnapshotIn} from "../models/User/MemberModel";
import {AddItemModal} from "../Components/Modals/AddItemModal";
import {GroupItem, GroupItemSnapshotIn} from "../models/GroupItem/GroupItemModel";
import {decryptStringWithAesCtr, encryptStringWithAesCtr, importAesKey} from "../utils/crypto/aes/encryption";
import {Group, GroupSnapshotIn} from "../models/Group/GroupModel";
import {GroupResponse} from "../services/api";

export const Home = observer(function Home() {
    const {userStore, groupStore, authStore} = useStores()
    const [isWasmInitialized, setWasmInitialized] = useState<boolean>(false);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const apiService = useApiService()
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const {isDrawerOpen, toggleDrawer} = useDrawer();

    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState<boolean>(false)
    const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState<boolean>(false)
    const [isConfirmErrorUserAddModalOpen, setIsConfirmErrorUserAddModalOpen] = useState<boolean>(false)
    const [isAddGroupItemModalOpen, setIsAddGroupItemModalOpen] = useState<boolean>(false)
    const [isItemDetailModalOpen, setIsItemDetailModalOpen] = useState<boolean>(false)

    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
    const [editedGroup, setEditedGroup] = useState<Group | null>(null)
    const [addItemType, setAddItemType] = useState<string>("")
    const [selectedGroupItem, setSelectedGroupItem] = useState<GroupItem | null>(null)

    const [searchTerm, setSearchTerm] = useState('');

    const [feedBack, setFeedback] = useState<{ type: "success" | "error", message: string } | null | undefined>()


    function stringToUint8Array(inputString: string): Uint8Array {
        const numberArray = inputString.split(',').map(Number);
        return new Uint8Array(numberArray);
    }

    const loadGroups = async () => {
        try {
            const groups = await apiService.getGroupCollection()

            const aesKey = await importAesKey(authStore.getKeyAsUint8Array());

            const promises = groups.map(async (group): Promise<GroupSnapshotIn> => {
                const decryptedSerializedGroup = await decryptStringWithAesCtr(group.serializedGroup.ciphertext, aesKey, group.serializedGroup.iv)
                return {...group, serializedGroup: decryptedSerializedGroup}
            })

            const decryptedSerializedGroups = await Promise.all(promises)


            applySnapshot(groupStore.groups, decryptedSerializedGroups)
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

            const aesKey = await importAesKey(authStore.getKeyAsUint8Array());

            const {
                ciphertext: serializedUserGroup_ciphertext,
                iv: serializedUserGroup_iv
            } = await encryptStringWithAesCtr(serializedGroup, aesKey)

            const createGroupResponse = await apiService.createGroup(
                {
                    name: name,
                    serializedGroup: {ciphertext: serializedUserGroup_ciphertext, iv: serializedUserGroup_iv},
                    ratchetTree: serializedRatchetTree
                }
            );

            const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(userStore.me.keyStore)})

            await updateKeyStore(keyStoreToUpdate)
            runInAction(() => {
                userStore.me.setKeyStore(keyStoreToUpdate)
            });

            runInAction(() => {
                groupStore.createNew({...createGroupResponse, serializedGroup: serializedGroup});
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

    const updateKeyStore = async (keyStoreToUpdate: string) => {

        const aesKey = await importAesKey(authStore.getKeyAsUint8Array());

        const {
            ciphertext: serialized_keyStore_ciphertext,
            iv: serialized_keyStore_iv
        } = await encryptStringWithAesCtr(keyStoreToUpdate, aesKey)


        await apiService.updateKeyStore({
            keyStore: {
                ciphertext: serialized_keyStore_ciphertext,
                iv: serialized_keyStore_iv
            }
        })
        runInAction(() => {
            userStore.me.setKeyStore(keyStoreToUpdate)
        });
    }

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

            const aesKey = await importAesKey(authStore.getKeyAsUint8Array());


            for (const group of groupsToJoin) {

                const deserializedRatchetTree = RatchetTree.deserialize(group.ratchetTree)
                const groupToJoin = MlsGroup.join(provider, stringToUint8Array(group.message), deserializedRatchetTree)
                const serializedGroup = groupToJoin.serialize()

                const {
                    ciphertext: serializedUserGroup_ciphertext,
                    iv: serializedUserGroup_iv
                } = await encryptStringWithAesCtr(serializedGroup, aesKey)

                const persistedSerializedUserGroup = await apiService.createSerializedUserGroupAfterJoin({
                    groupId: group.groupId,
                    serializedUserGroup: {ciphertext: serializedUserGroup_ciphertext, iv: serializedUserGroup_iv},
                    epoch: group.epoch,
                    welcomeMessageId: group.welcomeMessageId
                })

                groupStore.createNew({...persistedSerializedUserGroup, serializedGroup: serializedGroup})

                deserializedRatchetTree.free()
                groupToJoin.free()

            }

            const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(userStore.me.keyStore)})
            await updateKeyStore(keyStoreToUpdate)
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

            const decryptedGroupItems = await decryptGroupItems(group, getSnapshot(groupStore.groups[groupStore.getGroupIndex(group)].groupItems))

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
            await updateKeyStore(keyStoreToUpdate)
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
            const aesKey = await importAesKey(authStore.getKeyAsUint8Array());

            const serializedDeserializedUserGroup = deserializedGroup.serialize()

            const {
                ciphertext: serializedUserGroup_ciphertext,
                iv: serializedUserGroup_iv
            } = await encryptStringWithAesCtr(serializedDeserializedUserGroup, aesKey)

            let updateSerializedUserGroupResponse: GroupResponse;
            try {
                updateSerializedUserGroupResponse = await apiService.updateSerializedUserGroup({
                    serializedUserGroupId: group.serializedUserGroupId,
                    serializedUserGroup: {ciphertext: serializedUserGroup_ciphertext, iv: serializedUserGroup_iv},
                    epoch: group.epoch + 1,
                });
            } catch (error) {
                console.error("Failed to update serialized user group", error);
                return false;
            }
            runInAction(() => {
                const selectedGroup = groupStore.updateGroup({
                    ...updateSerializedUserGroupResponse,
                    serializedGroup: serializedDeserializedUserGroup
                })
                setEditedGroup(selectedGroup);
            });

            runInAction(() => {
                for (const groupItem of decryptedGroupItems) {
                    updateGroupItem(group, groupItem);
                }
            });

            provider.free();
            identity.free();
            deserializedGroup.free();
            deserializedKeyPackage.free()

            return true;
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes("Duplicate signature key in proposals and group")) {
                    console.log(error)
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

                const aesKey = await importAesKey(authStore.getKeyAsUint8Array());

                const serializedDeserializedUserGroup = deserializedGroup.serialize()

                const {
                    ciphertext: serializedUserGroup_ciphertext,
                    iv: serializedUserGroup_iv
                } = await encryptStringWithAesCtr(serializedDeserializedUserGroup, aesKey)

                try {
                    const updateSerializedUserGroupResponse = await apiService.updateSerializedUserGroup({
                        serializedUserGroupId: group.serializedUserGroupId,
                        serializedUserGroup: {ciphertext: serializedUserGroup_ciphertext, iv: serializedUserGroup_iv},
                        epoch: group.lastEpoch,
                    });
                    runInAction(() => {
                        groupStore.updateGroup({
                            ...updateSerializedUserGroupResponse,
                            serializedGroup: serializedDeserializedUserGroup
                        })
                    });
                } catch (error) {
                    console.error("Failed to update serialized user group", error);
                    return false;
                }

                deserializedGroup.free()
            }
            const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(userStore.me.keyStore)})
            await updateKeyStore(keyStoreToUpdate)
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
            const decryptedGroupItems = await decryptGroupItems(group, getSnapshot(groupStore.groups[groupStore.getGroupIndex(group)].groupItems))


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
            await updateKeyStore(keyStoreToUpdate)
            runInAction(() => {
                userStore.me.setKeyStore(keyStoreToUpdate)
            });

            const aesKey = await importAesKey(authStore.getKeyAsUint8Array());

            const serializedDeserializedUserGroup = deserializedGroup.serialize()

            const {
                ciphertext: serializedUserGroup_ciphertext,
                iv: serializedUserGroup_iv
            } = await encryptStringWithAesCtr(serializedDeserializedUserGroup, aesKey)

            let updateSerializedUserGroupResponse: GroupResponse;
            try {
                updateSerializedUserGroupResponse = await apiService.updateSerializedUserGroup({
                    serializedUserGroupId: group.serializedUserGroupId,
                    serializedUserGroup: {ciphertext: serializedUserGroup_ciphertext, iv: serializedUserGroup_iv},
                    epoch: group.epoch + 1,
                });
            } catch (error) {
                console.error("Failed to update serialized user group", error);
                return false;
            }

            runInAction(() => {
                const selectedGroup = groupStore.updateGroup({
                    ...updateSerializedUserGroupResponse,
                    serializedGroup: serializedDeserializedUserGroup
                })
                setEditedGroup(selectedGroup);
            });

            runInAction(() => {
                for (const groupItem of decryptedGroupItems) {
                    updateGroupItem(group, groupItem);
                }
            });

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
        const provider = Provider.deserialize(userStore.me.keyStore);
        const identity = Identity.deserialize(provider, userStore.me.serializedIdentity);

        const deserializedGroup = MlsGroup.deserialize(group.serializedGroup);

        const leave_msg = deserializedGroup.leave(
            provider,
            identity
        );

        await apiService.leaveGroup({
            message: leave_msg.commit.toString(),
            groupId: group.groupId,
            epoch: group.epoch
        });

        deserializedGroup.merge_pending_commit(provider)

        const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(userStore.me.keyStore)})
        await updateKeyStore(keyStoreToUpdate)
        runInAction(() => {
            userStore.me.setKeyStore(keyStoreToUpdate)
        });

        groupStore.removeGroup(group)

        setIsEditGroupModalOpen(false)

        provider.free();
        identity.free();
        deserializedGroup.free();

        return true;
    }

    const createNewGroupItem = async (group: GroupSnapshotIn, groupItem: GroupItemSnapshotIn) => {

        const {ciphertext, iv} = await encryptGroupData(group, groupItem.content.ciphertext)

        const newGroupItem = await apiService.createNewGroupItem({
            groupId: group.groupId,
            name: groupItem.name,
            description: groupItem.description,
            content: {ciphertext, iv},
            type: groupItem.type,
            epoch: group.lastEpoch
        })


        runInAction(() => {
            groupStore.groups[groupStore.getGroupIndex(group)].addGroupItem({
                ...newGroupItem,
                content: {ciphertext: groupItem.content.ciphertext, iv: ""},
                decrypted: true
            })
        })

        return true
    }
    const updateGroupItem = async (group: GroupSnapshotIn, groupItem: GroupItemSnapshotIn) => {

        const encryptedGroupItem = await encryptGroupItem(group, groupItem)

        await apiService.updateGroupItem({
            ...encryptedGroupItem,
            groupId: group.groupId,
            epoch: group.lastEpoch
        })

        runInAction(() => {
            groupStore.groups[groupStore.getGroupIndex(group)].updateGroupItem(groupItem)
        })
    }

    const deleteGroupItem = async (group: GroupSnapshotIn, groupItem: GroupItem) => {

        await apiService.deleteGroupItem({
            itemId: groupItem.itemId,
        })

        runInAction(() => {
            groupStore.groups[groupStore.getGroupIndex(group)].deleteGroupItem(groupItem)
        })
        return true
    }

    const deleteGroup = async (group: GroupSnapshotIn) => {

        await apiService.deleteGroup({groupId: group.groupId})

        runInAction(() => {
            groupStore.deleteGroup(groupStore.groups[groupStore.getGroupIndex(group)])
        })

    }

    const rotateGroupKey = async (group: GroupSnapshotIn) => {

        const decryptedGroupItems = await decryptGroupItems(group, getSnapshot(groupStore.groups[groupStore.getGroupIndex(group)].groupItems))

        const provider = Provider.deserialize(userStore.me.keyStore)
        const identity = Identity.deserialize(provider, userStore.me.serializedIdentity);

        const deserializedGroup = MlsGroup.deserialize(group.serializedGroup);

        const updateKeyMessage = deserializedGroup.update_key_package(provider, identity)

        await apiService.postGeneralCommitMessage({
            groupId: group.groupId,
            message: updateKeyMessage.commit.toString(),
            epoch: group.epoch
        })

        deserializedGroup.merge_pending_commit(provider)


        const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(userStore.me.keyStore)})
        await updateKeyStore(keyStoreToUpdate)
        runInAction(() => {
            userStore.me.setKeyStore(keyStoreToUpdate)
        });

        runInAction(() => {
            userStore.me.setKeyStore(keyStoreToUpdate)
        });

        const aesKey = await importAesKey(authStore.getKeyAsUint8Array());

        const serializedDeserializedUserGroup = deserializedGroup.serialize()

        const {
            ciphertext: serializedUserGroup_ciphertext,
            iv: serializedUserGroup_iv
        } = await encryptStringWithAesCtr(serializedDeserializedUserGroup, aesKey)

        const updateSerializedUserGroupResponse = await apiService.updateSerializedUserGroup({
            serializedUserGroupId: group.serializedUserGroupId,
            serializedUserGroup: {ciphertext: serializedUserGroup_ciphertext, iv: serializedUserGroup_iv},
            epoch: group.epoch + 1,
        });

        runInAction(() => {
            groupStore.updateGroup({
                ...updateSerializedUserGroupResponse,
                serializedGroup: serializedDeserializedUserGroup
            });
        });

        runInAction(() => {
            for (const groupItem of decryptedGroupItems) {
                updateGroupItem(group, groupItem);
            }
        });
    }

    const encryptGroupData = async (group: GroupSnapshotIn, data: string): Promise<{ ciphertext: string, iv: string }> => {

        const provider = Provider.deserialize(userStore.me.keyStore);

        const deserializedGroup = MlsGroup.deserialize(groupStore.groups[groupStore.getGroupIndex(group)].serializedGroup);

        const secret = deserializedGroup.export_key(
            provider,
            'encryptionKey',
            new Uint8Array(32).fill(0x30),
            32
        )

        const aesKey = await importAesKey(secret);

        const {ciphertext, iv} = await encryptStringWithAesCtr(data, aesKey);

        provider.free()
        deserializedGroup.free()

        return {ciphertext, iv}

    }
    const decryptGroupData = async (group: GroupSnapshotIn, data: string, iv: string): Promise<{ plaintext: string, }> => {

        const provider = Provider.deserialize(userStore.me.keyStore);

        const deserializedGroup = MlsGroup.deserialize(group.serializedGroup);

        const secret = deserializedGroup.export_key(
            provider,
            'encryptionKey',
            new Uint8Array(32).fill(0x30),
            32
        )

        console.log(secret)

        const aesKey = await importAesKey(secret);

        const plaintext = await decryptStringWithAesCtr(data, aesKey, iv);

        provider.free()
        deserializedGroup.free()

        return {plaintext}

    }

    const loadGroupItems = async (group: GroupSnapshotIn) => {

        const groupItems = await apiService.getGroupItems({groupId: group.groupId})

        const groupsItemsToDecrypt = groupItems.map((groupItem) => {
            return {...groupItem, decrypted: false}
        })

        const decryptedGroupItems = await decryptGroupItems(group, groupsItemsToDecrypt)

        runInAction(() => {
            groupStore.groups[groupStore.getGroupIndex(group)].setGroupItems(decryptedGroupItems)
        });
    }
    const decryptGroupItems = async (group: GroupSnapshotIn, groupItems: GroupItemSnapshotIn[]): Promise<GroupItemSnapshotIn[]> => {
        const promises = groupItems.map(async (groupItem) => await decryptGroupItem(group, groupItem))
        return await Promise.all(promises)
    }
    const decryptGroupItem = async (group: GroupSnapshotIn, groupItem: GroupItemSnapshotIn): Promise<GroupItemSnapshotIn> => {

        if (!groupItem.decrypted) {
            const decryptedContent = (await decryptGroupData(group, groupItem.content.ciphertext, groupItem.content.iv)).plaintext
            return {
                ...groupItem,
                content: {ciphertext: decryptedContent, iv: groupItem.content.iv},
                decrypted: true
            }
        } else {
            return groupItem
        }
    }

    const encryptGroupItems = async (group: GroupSnapshotIn, groupItems: GroupItemSnapshotIn[]) => {
        const promises = groupItems.map(async (groupItem) => await encryptGroupItem(group, groupItem))
        return await Promise.all(promises)
    }

    const encryptGroupItem = async (group: GroupSnapshotIn, groupItem: GroupItemSnapshotIn) => {
        if (groupItem.decrypted) {
            const {ciphertext, iv} = (await encryptGroupData(group, groupStore.groups[groupStore.getGroupIndex(group)].getGroupItemById(groupItem.groupId).content.ciphertext))
            return {
                ...groupItem,
                content: {ciphertext, iv},
                decrypted: false
            }
        } else {
            return groupItem
        }

    }

    const selectedGroupItems = selectedGroup != null ? selectedGroup.groupItems : undefined;
    useEffect(() => {

        if (isWasmInitialized && (selectedGroup !== null) && (selectedGroup.groupId !== undefined)) {
            loadGroupItems(selectedGroup)
        }
        // groupStore.updateGroup()
    }, [isWasmInitialized, selectedGroup, selectedGroupItems]);


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

    useEffect(() => {
        if (groupStore.groups.length > 0) {
            setSelectedGroup(groupStore.groups[0])
        }
    }, [groupStore.groups]);


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
                    onClick={() => {
                        if (selectedGroup !== null) {
                            setSelectedGroupItem(groupStore.groups[groupStore.getGroupIndex(selectedGroup)].getGroupItemById(params.row.id))
                            setIsItemDetailModalOpen(true)
                        }
                    }}
                >
                    <MoreVertIcon/>
                </IconButton>
            ),
        },
    ];

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const filteredGroups = searchTerm.length === 0
        ? groupStore.groups
        : groupStore.groups.filter(group =>
            group.name.toLowerCase().includes(searchTerm.toLowerCase())
        );


    const listContent = (
        <>
            <CardContent sx={{backgroundColor: "#dddddd", height: 40}}>
                <Grid container>
                    <Grid item xs={10}>
                        <TextField
                            id="outlined-search"
                            label="Hledání"
                            type="search"
                            size={"small"}
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
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
                    {filteredGroups.map((group, index) => (
                        <React.Fragment key={group.groupId /* Use group.id instead of index for key if possible */}>
                            <ListItemButton
                                selected={(selectedGroup !== null) && (selectedGroup.groupId === group.groupId)}
                                onClick={async () => {
                                    setSelectedGroup(group)
                                    if (selectedGroup !== null) {
                                        await loadGroupItems(selectedGroup)
                                    }
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
                                    setEditedGroup(group);
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
                onHandleClose={() => setIsConfirmErrorUserAddModalOpen(false)}
                onHandleSubmit={() => setIsConfirmErrorUserAddModalOpen(false)}
                title="Nelze přidat uživatele"
                text="Uživatel již jednou skupinu opustil. Není možné ho znovu přidat."
                successMessage=""
                onFeedback={(type, message) => setFeedback({type, message})}
            />
            <CreateGroupModal
                isOpen={isCreateGroupModalOpen}
                onHandleClose={() => setIsCreateGroupModalOpen(false)}
                onHandleSubmit={createGroup}
                onFeedback={(type, message) => setFeedback({type, message})}
            />
            {
                (editedGroup !== null) &&

                <EditGroupModal
                    isOpen={isEditGroupModalOpen}
                    onHandleClose={() => setIsEditGroupModalOpen(false)}
                    group={editedGroup}
                    me={userStore.me}
                    onHandleAddUser={addUser}
                    onHandleRemoveUser={removeUser}
                    onHandleLeaveGroup={leaveGroup}
                    onFeedback={(type, message) => setFeedback({type, message})}
                    onHandleGroupDelete={async () => deleteGroup(editedGroup)}
                    onRotateGroupKey={rotateGroupKey}
                />
            }
            {
                (selectedGroup !== null) &&
                <AddItemModal
                    isOpen={isAddGroupItemModalOpen}
                    onHandleClose={() => setIsAddGroupItemModalOpen(false)}
                    group={selectedGroup}
                    onItemCreate={createNewGroupItem}
                    type={addItemType}
                    onFeedback={(type, message) => setFeedback({type, message})}
                />
            }
            {
                ((selectedGroup !== null) && (selectedGroupItem !== null)) &&
                <ItemDetailModal
                    isOpen={isItemDetailModalOpen}
                    onHandleClose={() => setIsItemDetailModalOpen(false)}
                    groupItem={selectedGroupItem}
                    group={selectedGroup}
                    onUpdateItem={async (itemDetail: GroupItemSnapshotIn) => {
                        runInAction(() => {
                            updateGroupItem(selectedGroup, itemDetail)
                        });
                        return true
                    }}
                    onFeedback={(type, message) => setFeedback({type, message})}
                    onDeleteItem={async () => {
                        await deleteGroupItem(selectedGroup, selectedGroupItem)
                        return true
                    }}
                />
            }
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
                            {(selectedGroup !== null) && (selectedGroup.groupId !== "")
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
                                    {selectedGroup.groupItems && selectedGroup.groupItems.length > 0
                                        ?
                                        <DataGrid
                                            sx={{
                                                borderWidth: 0,
                                                "&.MuiDataGrid-root .MuiDataGrid-cell:focus-within": {
                                                    outline: "none !important",
                                                }
                                            }}
                                            rows={selectedGroup.groupItems?.map((groupItem) => {
                                                return {
                                                    id: groupItem.itemId,
                                                    type: groupItem.type,
                                                    name: groupItem.name,
                                                    description: groupItem.description
                                                }
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
                                            <Typography variant="h6" color={theme.palette.grey["400"]}>
                                                Přidejte položky
                                            </Typography>
                                            <Box flexDirection="row">
                                                {actions.map((action) => (
                                                    <Tooltip
                                                        key={action.name}
                                                        title={action.name}>
                                                        <IconButton
                                                            onClick={action.onClick}
                                                        >
                                                            {action.icon}
                                                        </IconButton>
                                                    </Tooltip>
                                                ))}
                                            </Box>
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