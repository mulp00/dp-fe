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
import __wbg_init, {Group, Identity, Provider} from "../utils/crypto/openmls";
import {applySnapshot, getSnapshot} from "mobx-state-tree";
import CreateGroupModal from "../Components/CreateGroupModal";
import {action} from "mobx";

export const Home = observer(function Home() {
    const {userStore, groupStore} = useStores()
    const [isWasmInitialized, setWasmInitialized] = useState<boolean>(false);
    const apiService = useApiService()
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const {isDrawerOpen, toggleDrawer} = useDrawer();
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState<boolean>(false)

    useEffect(() => {

        loadGroups()
    }, [apiService, groupStore.groups]);

    const loadGroups = async () => {
        const groups = await apiService.getGroupCollection()
        applySnapshot(groupStore.groups, groups)

    }

    const createGroup = async (name: string) => {
        try {
            const provider = new Provider();
            const identity = Identity.deserialize(userStore.me.serializedIdentity, provider);

            const group = Group.create_new(provider, identity, name);
            const serializedGroup = group.serialize();

            const createGroupResponse = await apiService.createGroup({ name, serializedGroup });
            console.log(createGroupResponse);

            action("updateGroupStore", () => {
                groupStore.createNew(createGroupResponse);
                console.log(getSnapshot(groupStore.groups));
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

    useEffect(() => {
        const initializeWasm = async () => {
            await __wbg_init();
        }
        if (!isWasmInitialized) {
            initializeWasm();
            setWasmInitialized(true);
        }
    }, [isWasmInitialized])

    const groups = groupStore.groups.map((group) => {
        return {name: group.name, members: group.users.length}
    })

    // Placeholder rows for DataGrid
    const rows = [
        {id: 1, type: 'card', name: 'Firemní ČSOB'},
        // ...more rows
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
                    {groups.map((company, index) => (
                        <React.Fragment key={index}>
                            <ListItem>
                                <Container>
                                    <Typography variant="body2">{company.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {company.members} členů
                                    </Typography>
                                </Container>
                                <IconButton>
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
                handleClose={() => {
                    setIsCreateGroupModalOpen(false)
                }}
                isOpen={isCreateGroupModalOpen}
                handleSubmit={createGroup}
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