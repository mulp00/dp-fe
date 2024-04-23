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
    Container, createTheme,
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
import {GroupItemSnapshotIn} from "../models/GroupItem/GroupItemModel";
import {decryptStringWithAesCtr, encryptStringWithAesCtr, importAesKey} from "../utils/crypto/aes/encryption";
import {Group, GroupSnapshotIn} from "../models/Group/GroupModel";
import {csCZ} from "@mui/x-data-grid/locales";

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

    const [selectedGroupId, setSelectedGroupId] = useState<string>("")
    const [editedGroupId, setEditedGroupId] = useState<string>("")
    const [addItemType, setAddItemType] = useState<"login" | "card">("login")
    const [selectedGroupItemId, setSelectedGroupItemId] = useState<string>("")

    const [searchTerm, setSearchTerm] = useState('');

    const [feedBack, setFeedback] = useState<{ type: "success" | "error", message: string } | null | undefined>()

    function stringToUint8Array(inputString: string): Uint8Array {
        const numberArray = inputString.split(',').map(Number);
        return new Uint8Array(numberArray);
    }

    const loadGroups = async () => {
        const groups = await apiService.getGroupCollection()

        const aesKey = await importAesKey(authStore.getKeyAsUint8Array());

        const promises = groups.map(async (group): Promise<GroupSnapshotIn> => {
            const decryptedSerializedGroup = await decryptStringWithAesCtr(group.serializedGroup.ciphertext, aesKey, group.serializedGroup.iv)
            return {...group, serializedGroup: decryptedSerializedGroup}
        })

        const decryptedSerializedGroups = await Promise.all(promises)

        runInAction(() => {
            applySnapshot(groupStore.groups, decryptedSerializedGroups)
        })

        await catchUpOnEpoch();

    }

    const createGroup = async (name: string) => {

        const meSnapshot = getSnapshot(userStore.me)

        const provider = Provider.deserialize(meSnapshot.keyStore);
        const identity = Identity.deserialize(provider, meSnapshot.serializedIdentity);

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

        const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(meSnapshot.keyStore)})

        await updateKeyStore(keyStoreToUpdate)

        runInAction(() => {
            groupStore.createNew({...createGroupResponse, serializedGroup: serializedGroup});
        });

        provider.free();
        identity.free();
        ratchetTree.free()
        group.free();


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
        const groupsToJoin: {
            welcomeMessageId: string,
            id: string,
            groupId: string,
            message: string,
            ratchetTree: string,
            epoch: string
        }[] = await apiService.getGroupsToJoin()

        const meSnapshot = getSnapshot(userStore.me)


        const provider = Provider.deserialize(meSnapshot.keyStore);

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

            groupToJoin.free()

        }

        const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(meSnapshot.keyStore)})
        await updateKeyStore(keyStoreToUpdate)

        provider.free()

    }

    const addUser = async (member: MemberSnapshotIn, groupId: string) => {

        await catchUpOnEpoch()

        const groupSnapshot = getSnapshot(groupStore.getGroupById(groupId))
        const meSnapshot = getSnapshot(userStore.me)

        const decryptedGroupItems = await decryptGroupItems(groupId, groupSnapshot.groupItems)

        const provider = Provider.deserialize(meSnapshot.keyStore);
        const identity = Identity.deserialize(provider, meSnapshot.serializedIdentity);

        const deserializedGroup = MlsGroup.deserialize(groupSnapshot.serializedGroup);

        const deserializedKeyPackage = KeyPackage.deserialize(member.keyPackage)

        let add_msg
        try {
            add_msg = deserializedGroup.add_member(
                provider,
                identity,
                deserializedKeyPackage
            );
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes("Duplicate signature key in proposals and group")) {
                    console.error(error)
                    setIsConfirmErrorUserAddModalOpen(true)
                }
            }
            provider.free();
            identity.free();
            deserializedGroup.free();
            deserializedKeyPackage.free()
            console.error("Unexpected error while adding user ", error);
            return false
        }

        deserializedGroup.merge_pending_commit(provider)


        const ratchetTree = deserializedGroup.export_ratchet_tree()
        const serializedRatchetTree = ratchetTree.serialize()


        const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(meSnapshot.keyStore)})
        await updateKeyStore(keyStoreToUpdate)

        await apiService.createWelcomeMessage({
            welcomeMessage: add_msg.welcome.toString(),
            commitMessage: add_msg.commit.toString(),
            memberId: member.id,
            groupId: groupId,
            ratchetTree: serializedRatchetTree,
        });

        const aesKey = await importAesKey(authStore.getKeyAsUint8Array());

        const serializedDeserializedUserGroup = deserializedGroup.serialize()

        const {
            ciphertext: serializedUserGroup_ciphertext,
            iv: serializedUserGroup_iv
        } = await encryptStringWithAesCtr(serializedDeserializedUserGroup, aesKey)


        const updateSerializedUserGroupResponse = await apiService.updateSerializedUserGroup({
            serializedUserGroupId: groupSnapshot.serializedUserGroupId,
            serializedUserGroup: {ciphertext: serializedUserGroup_ciphertext, iv: serializedUserGroup_iv},
            epoch: groupSnapshot.epoch + 1,
        });

        runInAction(() => {
            const selectedGroup = groupStore.updateGroup({
                ...updateSerializedUserGroupResponse,
                serializedGroup: serializedDeserializedUserGroup
            })
            // setEditedGroupId(selectedGroup.groupId);
        });

        runInAction(() => {
            for (const groupItem of decryptedGroupItems) {
                updateGroupItem(groupId, groupItem);
            }
        });

        provider.free();
        identity.free();
        deserializedGroup.free();
        deserializedKeyPackage.free()
        add_msg.free()
        ratchetTree.free()

        return true;

    }

    const catchUpOnEpoch = async () => {
        const meSnapshot = getSnapshot(userStore.me)
        const groupsSnapshot: GroupSnapshotIn[] = getSnapshot(groupStore.groups)

        const provider = Provider.deserialize(meSnapshot.keyStore);

        for (const group of groupsSnapshot) {
            const commitMessages: {
                message: string;
                epoch: number;
            }[] = await apiService.getCommitMessages({groupId: group.groupId, epoch: group.lastEpoch})

            if (commitMessages.length === 0) continue

            const deserializedGroup = MlsGroup.deserialize(group.serializedGroup);

            commitMessages.sort((a, b) => a.epoch - b.epoch);

            let newEpoch = -1

            for (const commitMessage of commitMessages) {


                try {
                    deserializedGroup.process_message(provider, stringToUint8Array(commitMessage.message))
                    deserializedGroup.merge_pending_commit(provider)
                    newEpoch = commitMessage.epoch
                } catch (error) {
                    if (error instanceof Error) {
                        console.error(error.message)
                    }
                }

            }

            if (newEpoch === -1) break

            const aesKey = await importAesKey(authStore.getKeyAsUint8Array());

            const serializedDeserializedUserGroup = deserializedGroup.serialize()

            const {
                ciphertext: serializedUserGroup_ciphertext,
                iv: serializedUserGroup_iv
            } = await encryptStringWithAesCtr(serializedDeserializedUserGroup, aesKey)

            const updateSerializedUserGroupResponse = await apiService.updateSerializedUserGroup({
                serializedUserGroupId: group.serializedUserGroupId,
                serializedUserGroup: {ciphertext: serializedUserGroup_ciphertext, iv: serializedUserGroup_iv},
                epoch: newEpoch,
            });
            runInAction(() => {
                groupStore.updateGroup({
                    ...updateSerializedUserGroupResponse,
                    serializedGroup: serializedDeserializedUserGroup
                })
            });


            deserializedGroup.free()
        }
        const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(meSnapshot.keyStore)})
        await updateKeyStore(keyStoreToUpdate)

        provider.free()

    }

    const removeUser = async (member: MemberSnapshotIn, groupId: string) => {

        await catchUpOnEpoch()

        const groupSnapshot = getSnapshot(groupStore.getGroupById(groupId))
        const meSnapshot = getSnapshot(userStore.me)

        const decryptedGroupItems = await decryptGroupItems(groupId, groupSnapshot.groupItems)

        const provider = Provider.deserialize(meSnapshot.keyStore);
        const identity = Identity.deserialize(provider, meSnapshot.serializedIdentity);

        const deserializedGroup = MlsGroup.deserialize(groupSnapshot.serializedGroup);

        const deserializedRemovedMemberKeyPackage = KeyPackage.deserialize(member.keyPackage)

        const removedMemberIndex = deserializedGroup.get_member_index(deserializedRemovedMemberKeyPackage)

        const deserializedKeyPackage = KeyPackage.deserialize(member.keyPackage)

        const add_msg = deserializedGroup.remove_member(
            provider,
            identity,
            removedMemberIndex
        );

        await apiService.removeUser({
            message: add_msg.commit.toString(),
            groupId: groupSnapshot.groupId,
            userId: member.id,
            epoch: groupSnapshot.epoch
        });

        deserializedGroup.merge_pending_commit(provider)

        const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(meSnapshot.keyStore)})
        await updateKeyStore(keyStoreToUpdate)


        const aesKey = await importAesKey(authStore.getKeyAsUint8Array());

        const serializedDeserializedUserGroup = deserializedGroup.serialize()

        const {
            ciphertext: serializedUserGroup_ciphertext,
            iv: serializedUserGroup_iv
        } = await encryptStringWithAesCtr(serializedDeserializedUserGroup, aesKey)

        const updateSerializedUserGroupResponse = await apiService.updateSerializedUserGroup({
            serializedUserGroupId: groupSnapshot.serializedUserGroupId,
            serializedUserGroup: {ciphertext: serializedUserGroup_ciphertext, iv: serializedUserGroup_iv},
            epoch: groupSnapshot.epoch + 1,
        });

        runInAction(() => {
            const selectedGroup = groupStore.updateGroup({
                ...updateSerializedUserGroupResponse,
                serializedGroup: serializedDeserializedUserGroup
            })
            setEditedGroupId(selectedGroup.groupId);
        });

        runInAction(() => {
            for (const groupItem of decryptedGroupItems) {
                updateGroupItem(groupId, groupItem);
            }
        });

        provider.free();
        identity.free();
        deserializedGroup.free();
        deserializedKeyPackage.free()
        deserializedRemovedMemberKeyPackage.free()
        removedMemberIndex.free()
        add_msg.free()

        return true;

    }
    const leaveGroup = async (groupId: string) => {

        setEditedGroupId("")
        setSelectedGroupId("")
        const meSnapshot = getSnapshot(userStore.me)

        const groupSnapshot = getSnapshot(groupStore.getGroupById(groupId))

        const provider = Provider.deserialize(meSnapshot.keyStore);
        const identity = Identity.deserialize(provider, meSnapshot.serializedIdentity);

        const deserializedGroup = MlsGroup.deserialize(groupSnapshot.serializedGroup);

        const leave_msg = deserializedGroup.leave(
            provider,
            identity
        );

        await apiService.leaveGroup({
            message: leave_msg.commit.toString(),
            groupId: groupSnapshot.groupId,
            epoch: groupSnapshot.epoch
        });

        deserializedGroup.merge_pending_commit(provider)


        const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(meSnapshot.keyStore)})
        await updateKeyStore(keyStoreToUpdate)

        runInAction(() => {
            groupStore.removeGroup(groupId)
        })


        setIsEditGroupModalOpen(false)

        provider.free();
        identity.free();
        deserializedGroup.free();
        leave_msg.free()

        return true;
    }

    const createNewGroupItem = async (groupId: string, groupItem: GroupItemSnapshotIn) => {

        await catchUpOnEpoch()

        const groupSnapshot = getSnapshot(groupStore.getGroupById(groupId))

        const {ciphertext, iv} = await encryptGroupData(groupId, groupItem.content.ciphertext)

        const newGroupItem = await apiService.createNewGroupItem({
            groupId: groupId,
            name: groupItem.name,
            description: groupItem.description,
            content: {ciphertext, iv},
            type: groupItem.type,
            epoch: groupSnapshot.lastEpoch
        })


        runInAction(() => {
            groupStore.getGroupById(groupId).addGroupItem({
                ...newGroupItem,
                content: {ciphertext: groupItem.content.ciphertext, iv: ""},
                decrypted: true
            })
        })

        return true
    }
    const updateGroupItem = async (groupId: string, groupItem: GroupItemSnapshotIn) => {

        await catchUpOnEpoch()

        const groupSnapshot = getSnapshot(groupStore.getGroupById(groupId))
        const encryptedGroupItem = await encryptGroupItem(groupId, groupItem)

        await apiService.updateGroupItem({
            ...encryptedGroupItem,
            groupId: groupId,
            epoch: groupSnapshot.lastEpoch
        })

        runInAction(() => {
            groupStore.getGroupById(groupId).updateGroupItem(groupItem)
        })
    }

    const deleteGroupItem = async (groupId: string, groupItemId: string) => {

        await apiService.deleteGroupItem({
            groupId: groupId,
            itemId: groupItemId,
        })

        runInAction(() => {
            groupStore.getGroupById(groupId).deleteGroupItem(groupItemId)
        })
        return true
    }

    const deleteGroup = async (groupId: string) => {
        setEditedGroupId("")
        setSelectedGroupId("")

        await apiService.deleteGroup({groupId: groupId})

        runInAction(() => {
            groupStore.deleteGroup(groupId)
        })

    }

    const rotateGroupKey = async (groupId: string) => {

        await catchUpOnEpoch()

        const groupSnapshot = getSnapshot(groupStore.getGroupById(groupId))
        const meSnapshot = getSnapshot(userStore.me)

        const decryptedGroupItems = await decryptGroupItems(groupId, groupSnapshot.groupItems)

        const provider = Provider.deserialize(meSnapshot.keyStore)
        const identity = Identity.deserialize(provider, meSnapshot.serializedIdentity);

        const deserializedGroup = MlsGroup.deserialize(groupSnapshot.serializedGroup);

        const updateKeyMessage = deserializedGroup.update_key_package(provider, identity)

        await apiService.postGeneralCommitMessage({
            groupId: groupSnapshot.groupId,
            message: updateKeyMessage.commit.toString(),
            epoch: groupSnapshot.epoch
        })

        deserializedGroup.merge_pending_commit(provider)

        const keyStoreToUpdate = JSON.stringify(
            {
                ...JSON.parse(provider.serialize()),
                ...JSON.parse(meSnapshot.keyStore)
            }
        )
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

        const updateSerializedUserGroupResponse = await apiService.updateSerializedUserGroup(
            {
                serializedUserGroupId: groupSnapshot.serializedUserGroupId,
                serializedUserGroup: {ciphertext: serializedUserGroup_ciphertext, iv: serializedUserGroup_iv},
                epoch: groupSnapshot.epoch + 1,
            });

        runInAction(() => {
            groupStore.updateGroup({
                ...updateSerializedUserGroupResponse,
                serializedGroup: serializedDeserializedUserGroup
            });
        });

        runInAction(() => {
            for (const groupItem of decryptedGroupItems) {
                updateGroupItem(groupId, groupItem);
            }
        });

        await loadGroupItems(groupId)

        provider.free()
        identity.free()
        deserializedGroup.free()
        updateKeyMessage.free()

    }

    const encryptGroupData = async (groupId: string, data: string): Promise<{ ciphertext: string, iv: string }> => {

        const meSnapshot = getSnapshot(userStore.me)
        const groupSnapshot = getSnapshot(groupStore.getGroupById(groupId))

        const provider = Provider.deserialize(meSnapshot.keyStore);

        const deserializedGroup = MlsGroup.deserialize(groupSnapshot.serializedGroup);

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
    const decryptGroupData = async (groupId: string, data: string, iv: string): Promise<{ plaintext: string, }> => {

        const meSnapshot = getSnapshot(userStore.me)
        const groupSnapshot = getSnapshot(groupStore.getGroupById(groupId))

        const provider = Provider.deserialize(meSnapshot.keyStore);

        const deserializedGroup = MlsGroup.deserialize(groupSnapshot.serializedGroup);

        const secret = deserializedGroup.export_key(
            provider,
            'encryptionKey',
            new Uint8Array(32).fill(0x30),
            32
        )

        const aesKey = await importAesKey(secret);

        const plaintext = await decryptStringWithAesCtr(data, aesKey, iv);

        provider.free()
        deserializedGroup.free()

        return {plaintext}

    }

    const loadGroupItems = async (groupId: string) => {

        const groupItems = await apiService.getGroupItems({groupId: groupId})

        const groupsItemsToDecrypt = groupItems.map((groupItem) => {
            return {...groupItem, decrypted: false}
        })

        const decryptedGroupItems = await decryptGroupItems(groupId, groupsItemsToDecrypt)

        runInAction(() => {
            groupStore.getGroupById(selectedGroupId).setGroupItems(decryptedGroupItems)
        });
    }
    const decryptGroupItems = async (groupId: string, groupItems: GroupItemSnapshotIn[]): Promise<GroupItemSnapshotIn[]> => {
        const promises = groupItems.map(async (groupItem) => await decryptGroupItem(groupId, groupItem))
        return await Promise.all(promises)
    }
    const decryptGroupItem = async (groupId: string, groupItem: GroupItemSnapshotIn): Promise<GroupItemSnapshotIn> => {

        if (!groupItem.decrypted) {
            const decryptedContent = (await decryptGroupData(groupId, groupItem.content.ciphertext, groupItem.content.iv)).plaintext
            return {
                ...groupItem,
                content: {ciphertext: decryptedContent, iv: ""},
                decrypted: true
            }
        } else {
            return groupItem
        }
    }

    const encryptGroupItems = async (groupId: string, groupItems: GroupItemSnapshotIn[]) => {
        const promises = groupItems.map(async (groupItem) => await encryptGroupItem(groupId, groupItem))
        return await Promise.all(promises)
    }

    const encryptGroupItem = async (groupId: string, groupItem: GroupItemSnapshotIn) => {
        if (groupItem.decrypted) {
            const {ciphertext, iv} = (await encryptGroupData(groupId, groupItem.content.ciphertext))
            return {
                ...groupItem,
                content: {ciphertext, iv},
                decrypted: false
            }
        } else {
            return groupItem
        }

    }


    const selectedGroupItems = ((selectedGroupId !== "") && (groupStore.getGroupById(selectedGroupId))) ? groupStore.getGroupById(selectedGroupId).groupItems : undefined;
    useEffect(() => {

        if (isWasmInitialized && (selectedGroupId !== "") && (selectedGroupId !== "") && selectedGroupItems) {
            loadGroupItems(selectedGroupId)
        }
        // groupStore.updateGroup()
    }, [isWasmInitialized, selectedGroupId, selectedGroupItems]);


    useEffect(() => {
        const initializeWasm = async () => {
            await __wbg_init();
        }
        if (!isWasmInitialized) {
            initializeWasm().then(async () => {

                if (!initialLoadDone) {
                    await joinGroups();
                    await loadGroups();

                    setInitialLoadDone(true);
                }
            });
            setWasmInitialized(true);
        }
    }, [isWasmInitialized, initialLoadDone]);

    useEffect(() => {
        const groupStoreSnapshot = getSnapshot(groupStore)
        if (groupStoreSnapshot.groups.length > 0) {
            setSelectedGroupId(groupStoreSnapshot.groups[0].groupId)
        }
    }, [groupStore, groupStore.groups]);


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
            headerName: ' ',
            sortable: false,
            renderCell: (params: GridRenderCellParams) => (
                <IconButton
                    onClick={() => {
                        if (selectedGroupId !== null) {
                            setSelectedGroupItemId(groupStore.getGroupItemByIds(selectedGroupId, params.row.id).itemId)
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
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%'
        }}
        >
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
            <CardContent sx={{height: "100%"}}>
                {groupStore.groups.length > 0 ?
                    <List>
                        {
                            filteredGroups.map((group, index) => (
                                <React.Fragment
                                    key={group.groupId /* Use group.id instead of index for key if possible */}>
                                    <ListItemButton
                                        selected={(selectedGroupId !== "") && (selectedGroupId === group.groupId)}
                                        onClick={async () => {
                                            setSelectedGroupId(group.groupId)
                                            if (selectedGroupId !== "") {
                                                await loadGroupItems(selectedGroupId)
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
                                            setEditedGroupId(group.groupId);
                                            setIsEditGroupModalOpen(true);
                                        }}>
                                            <MoreVertIcon/>
                                        </IconButton>
                                    </ListItemButton>
                                    {index < groupStore.groups.length - 1 && <Divider/>}
                                </React.Fragment>
                            ))
                        }
                    </List>
                    :
                    <Box
                        display="flex"
                        flexDirection="column"
                        justifyContent="center"
                        alignItems="center"
                        height="60%"
                        width="100%"
                    >
                        <Typography variant="h6" color={theme.palette.grey["400"]}>
                            Začněte přidáním skupiny
                        </Typography>

                        <Tooltip
                            title="Přidat skupinu">
                            <IconButton aria-label="add to shopping cart" size="medium"
                                        onClick={() => setIsCreateGroupModalOpen(true)}>
                                <GroupAddIcon/>
                            </IconButton>
                        </Tooltip>
                    </Box>
                }


            </CardContent>
        </Box>
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
                (editedGroupId !== "") &&

                <EditGroupModal
                    isOpen={isEditGroupModalOpen}
                    onHandleClose={() => {
                        setEditedGroupId("")
                        setIsEditGroupModalOpen(false)
                    }}
                    groupId={editedGroupId}
                    meSnapshot={getSnapshot(userStore.me)}
                    onHandleAddUser={addUser}
                    onHandleRemoveUser={removeUser}
                    onHandleLeaveGroup={leaveGroup}
                    onFeedback={(type, message) => setFeedback({type, message})}
                    onHandleGroupDelete={async () => {
                        setEditedGroupId("")
                        deleteGroup(editedGroupId)
                    }}
                    onRotateGroupKey={rotateGroupKey}
                />
            }
            {
                (selectedGroupId !== "") &&
                <AddItemModal
                    isOpen={isAddGroupItemModalOpen}
                    onHandleClose={() => setIsAddGroupItemModalOpen(false)}
                    groupId={selectedGroupId}
                    onItemCreate={createNewGroupItem}
                    type={addItemType}
                    onFeedback={(type, message) => setFeedback({type, message})}
                />
            }
            {
                ((selectedGroupId !== "") && (selectedGroupItemId !== "") && (groupStore.getGroupItemByIds(selectedGroupId, selectedGroupItemId))) &&
                <ItemDetailModal
                    isOpen={isItemDetailModalOpen}
                    onHandleClose={() => setIsItemDetailModalOpen(false)}
                    groupItem={getSnapshot(groupStore.getGroupItemByIds(selectedGroupId, selectedGroupItemId))}
                    onUpdateItem={async (itemDetail: GroupItemSnapshotIn) => {
                        runInAction(() => {
                            updateGroupItem(selectedGroupId, itemDetail)
                        });
                        return true
                    }}
                    onFeedback={(type, message) => setFeedback({type, message})}
                    onDeleteItem={async () => {
                        await deleteGroupItem(selectedGroupId, selectedGroupItemId)
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
                            <Card sx={{height: '85vh', display: 'flex', flexDirection: 'column'}} elevation={3}>
                                {listContent}
                            </Card>
                        </Grid>
                    )}


                    <Grid item xs={isMobile ? 12 : 9}>

                        <Card sx={{height: '100%', width: '100%'}} elevation={3}>
                            {(selectedGroupId !== "")
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
                                    {groupStore.getGroupById(selectedGroupId)?.groupItems && groupStore.getGroupById(selectedGroupId)?.groupItems.length > 0
                                        ?
                                        <DataGrid
                                            localeText={csCZ.components.MuiDataGrid.defaultProps.localeText}
                                            sx={{
                                                borderWidth: 0,
                                                "&.MuiDataGrid-root .MuiDataGrid-cell:focus-within": {
                                                    outline: "none !important",
                                                },
                                                '& .MuiDataGrid-row:hover': {
                                                    cursor: 'pointer'
                                                }
                                            }}
                                            rows={groupStore.getGroupById(selectedGroupId).groupItems?.map((groupItem) => {
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
                                            onRowClick={(params)=>{
                                                if (selectedGroupId !== null) {
                                                    setSelectedGroupItemId(groupStore.getGroupItemByIds(selectedGroupId, params.row.id).itemId)
                                                    setIsItemDetailModalOpen(true)
                                                }
                                            }}
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
                                groupStore.groups.length > 0 &&
                                <Box
                                    display="flex"
                                    justifyContent="center"
                                    alignItems="center"
                                    height="60%"
                                    width="100%"
                                >
                                    <Typography variant="h6" color={theme.palette.grey["400"]}>
                                        Vyberte Skupinu
                                    </Typography>
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