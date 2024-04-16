import * as React from 'react';
import {FC, useState} from 'react';
import {Link, NavLink, useNavigate} from 'react-router-dom';
import {
    Alert,
    AppBar,
    Avatar,
    Box,
    Button,
    IconButton,
    Menu,
    MenuItem, Snackbar,
    SpeedDial,
    SpeedDialAction,
    Toolbar,
    Typography,
    useMediaQuery,
    useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ShieldIcon from '@mui/icons-material/Shield';
import {useStores} from "../models/helpers/useStores";
import {observer} from "mobx-react";
import {clear as storageClear} from "../utils/storage";
import {useDrawer} from "../context/DrawerContext";
import LogoutIcon from '@mui/icons-material/Logout';
import {Identity, Provider} from "../utils/crypto/openmls";
import {runInAction} from "mobx";
import LockResetIcon from '@mui/icons-material/LockReset';
import {ConfirmModal} from "./Modals/ConfirmModal";
import {encryptStringWithAesCtr, importAesKey} from "../utils/crypto/aes/encryption";
import {useApiService} from "../hooks";

const ResponsiveAppBar: FC = observer(function ResponsiveAppBar() {

    const apiService = useApiService()

    const {authStore, userStore, clear} = useStores()
    const isAuthenticated = authStore.isAuthenticated()

    const [isRefreshKeyModalOpen, setIsRefreshKeyModalOpen] = useState<boolean>(false)

    const {toggleDrawer} = useDrawer();

    const theme = useTheme();

    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const navigate = useNavigate();

    const pages = isAuthenticated ? [] : [
        { name: 'Login', path: '/login', translation: 'Přihlášení' },
        { name: 'Register', path: '/register', translation: 'Registrace' }
    ];

    const settings = ['Logout'];

    const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);
    const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(null);

    const [feedBack, setFeedback] = useState<{ type: "success" | "error", message: string } | null | undefined>()

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

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    const refreshKeyPackage = async () => {

        const provider = Provider.deserialize(userStore.me.keyStore);
        const identity = Identity.deserialize(provider, userStore.me.serializedIdentity);
        const keyStoreToUpdate = JSON.stringify({...JSON.parse(provider.serialize()), ...JSON.parse(userStore.me.keyStore)})


        const newKeyPackage = identity.key_package(provider)

        await apiService.updateKeyPackage({keyPackage: newKeyPackage.serialize()})
        runInAction(() => {
            userStore.me.setKeyStore(keyStoreToUpdate)
        });

        await updateKeyStore(keyStoreToUpdate)
        runInAction(() => {
            userStore.me.setKeyStore(keyStoreToUpdate)
        });

        newKeyPackage.free()
        provider.free();
        identity.free();
    }

    const conditionalPadding = isMobile ? 2 : 5; // Conditional padding based on screen size

    return ( // TODO asi to bude chtit nejak poresit to opetovne pridani do skupiny po tom co ji clovek opusti. Pak asi uz zacit resit samotne sifrovane polozky. Pak registraci a zmenu prihlasovacich udaju tj aktualizace mfkdf
        <>
            <ConfirmModal
                isOpen={isRefreshKeyModalOpen}
                onHandleClose={() => setIsRefreshKeyModalOpen(false)}
                onHandleSubmit={refreshKeyPackage}
                title="Aktualizovat veřejný klíč"
                text="Pokud máte pochyby, zda nedošlo ke kompromitaci vašeho veřejného klíče, vygenerujte nový!
                Klíč bude použit pro každé nové členství ve skupinách."
                confirmText="Vygenerovat"
                successMessage="Klíče aktualizovány"
                onFeedback={(type, message) => setFeedback({type, message})}
            />
            <AppBar position="static" sx={{paddingLeft: conditionalPadding, paddingRight: conditionalPadding}}>
                <Toolbar disableGutters>
                    <ShieldIcon sx={{display: {xs: 'none', md: 'flex'}, mr: 1}}/>
                    <Typography
                        variant="h6"
                        noWrap
                        component={Link}
                        to="/"
                        sx={{
                            mr: 2,
                            display: {xs: 'none', md: 'flex'},
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            letterSpacing: '.3rem',
                            color: 'inherit',
                            textDecoration: 'none',
                        }}
                    >
                        SHARY
                    </Typography>

                    <Box sx={{flexGrow: 1, display: {xs: 'flex', md: 'none'}}}>
                        <IconButton
                            size="large"
                            aria-label="navigation menu"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            onClick={toggleDrawer}
                            color="inherit"
                        >
                            <MenuIcon/>
                        </IconButton>
                        <Menu
                            id="menu-appbar"
                            anchorEl={anchorElNav}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'left',
                            }}
                            open={Boolean(anchorElNav)}
                            sx={{
                                display: {xs: 'block', md: 'none'},
                            }}
                        >
                            {pages.map((page) => (
                                <MenuItem key={page.name}>
                                    <Typography textAlign="center" component={NavLink}
                                                to={page.path} // Use path for navigation
                                                sx={{color: 'text.primary', textDecoration: 'none'}}>
                                        {page.translation}
                                    </Typography>
                                </MenuItem>
                            ))}
                        </Menu>
                    </Box>
                    <ShieldIcon sx={{display: {xs: 'flex', md: 'none'}, mr: 1}}/>
                    <Typography
                        variant="h5"
                        noWrap
                        component={Link}
                        to="/"
                        sx={{
                            mr: 2,
                            display: {xs: 'flex', md: 'none'},
                            flexGrow: 1,
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            letterSpacing: '.3rem',
                            color: 'inherit',
                            textDecoration: 'none',
                        }}
                    >
                        LOGO
                    </Typography>
                    {pages.map((page) => (
                        <Button
                            key={page.name}
                            sx={{my: 2, color: 'white', display: 'block'}}
                            component={React.forwardRef((props, ref) => (
                                <NavLink
                                    to={page.path}
                                    style={({isActive}) => ({
                                        textDecoration: isActive ? 'underline' : 'none',
                                    })}
                                    {...props}
                                >
                                    {page.translation}
                                </NavLink>
                            ))}
                        >
                            {page.translation}
                        </Button>
                    ))}


                    {
                        isAuthenticated &&

                        <Box sx={{flexGrow: 0, ml: 'auto'}}>
                            <SpeedDial
                                direction={'left'}
                                ariaLabel="profile"
                                icon={<Avatar>{userStore.me.email.charAt(0).toUpperCase()}</Avatar>}
                                FabProps={{style: {boxShadow: "none"}}}
                            >
                                <SpeedDialAction
                                    key={'logout'}
                                    icon={<LogoutIcon/>}
                                    tooltipTitle={'Odhlásit'}
                                    onClick={async () => {
                                        try {
                                            await apiService.logout()
                                        } finally {
                                            clear(); //  authStore's method to clear the session
                                            await storageClear(); // Clearing storage
                                            apiService.removeAuthToken()
                                            navigate('/login'); // Redirecting to login page
                                        }
                                    }}
                                />
                                <SpeedDialAction
                                    sx={{background: theme.palette.warning.main}}
                                    key={'keyRefresh'}
                                    icon={<LockResetIcon/>}
                                    tooltipTitle={'Přegenerovat veřejný klíč'}
                                    onClick={() => setIsRefreshKeyModalOpen(true)}
                                />
                            </SpeedDial>

                            <Menu
                                id="menu-appbar"
                                anchorEl={anchorElUser}
                                anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                keepMounted
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                open={Boolean(anchorElUser)}
                                onClose={handleCloseUserMenu}
                            >
                                {settings.map((setting) => (
                                    <MenuItem key={setting} onClick={async () => {
                                        if (setting === 'Logout') {
                                            try {
                                                await apiService.logout()
                                            } finally {
                                                clear(); //  authStore's method to clear the session
                                                await storageClear(); // Clearing storage
                                                apiService.removeAuthToken() // remove auth header
                                                navigate('/login'); // Redirecting to login page
                                            }
                                        }
                                        handleCloseUserMenu()
                                    }}>
                                        <Typography textAlign="center">{setting}</Typography>
                                    </MenuItem>
                                ))}
                            </Menu>
                        </Box>}
                </Toolbar>
            </AppBar>
            <Snackbar open={!!feedBack} autoHideDuration={6000} onClose={() => setFeedback(null)}>
                <Alert onClose={() => setFeedback(null)} severity={feedBack?.type} sx={{width: '100%'}}>
                    {feedBack?.message}
                </Alert>
            </Snackbar>
        </>
    );
})

export default ResponsiveAppBar;
