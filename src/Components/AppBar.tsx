import * as React from 'react';
import {Link, NavLink, useNavigate} from 'react-router-dom';
import {
    AppBar,
    Avatar,
    Box,
    Button,
    Container,
    IconButton,
    Menu,
    MenuItem, SpeedDial, SpeedDialAction, SpeedDialIcon,
    Toolbar,
    Tooltip,
    Typography, useMediaQuery, useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ShieldIcon from '@mui/icons-material/Shield';
import {useStores} from "../models/helpers/useStores";
import {observer} from "mobx-react";
import {FC} from "react";
import {clear as storageClear} from "../utils/storage";
import {useDrawer} from "../context/DrawerContext";
import LogoutIcon from '@mui/icons-material/Logout';
import apiService from "../services/api";


const ResponsiveAppBar: FC = observer(function ResponsiveAppBar() {

    const {authStore, userStore, clear} = useStores()
    const isAuthenticated = authStore.isAuthenticated()

    const {toggleDrawer} = useDrawer();

    const theme = useTheme();

    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const navigate = useNavigate();

    const pages = isAuthenticated ? [] : ['Login', 'Register'];
    const settings = ['Logout'];

    const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);
    const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(null);

    const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorElUser(event.currentTarget);
    };

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    const conditionalPadding = isMobile ? 2 : 5; // Conditional padding based on screen size

    return (
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
                            <MenuItem key={page}>
                                <Typography textAlign="center" component={NavLink}
                                            to={`/${page.replace(/\s+/g, '').toLowerCase()}`}
                                            sx={{color: 'text.primary', textDecoration: 'none'}}>
                                    {page}
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
                        key={page}
                        sx={{my: 2, color: 'white', display: 'block'}}
                        component={React.forwardRef((props, ref) => (
                            <NavLink
                                to={`/${page.replace(/\s+/g, '').toLowerCase()}`}
                                style={({isActive}) => ({
                                    textDecoration: isActive ? 'underline' : 'none',
                                })}
                                {...props}
                            />
                        ))}
                    >
                        {page}
                    </Button>
                ))}


                {
                    isAuthenticated &&

                    <Box sx={{flexGrow: 0, ml: 'auto'}}>
                        <SpeedDial
                            direction={'left'}
                            ariaLabel="profile"
                            icon={<Avatar>{userStore.me.email.charAt(0).toUpperCase()}</Avatar>}
                            FabProps={{  style: { boxShadow: "none" } }}
                        >
                            <SpeedDialAction
                                key={'logout'}
                                icon={<LogoutIcon/>}
                                tooltipTitle={'Odhlásit'}
                                onClick={()=>{
                                    clear(); //  authStore's method to clear the session
                                    storageClear(); // Clearing storage
                                    navigate('/login'); // Redirecting to login page
                                }}
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
                                <MenuItem key={setting} onClick={() => {
                                    if (setting === 'Logout') {
                                        clear(); //  authStore's method to clear the session
                                        storageClear(); // Clearing storage
                                        apiService.removeAuthToken() // remove auth header
                                        navigate('/login'); // Redirecting to login page
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
    );
})

export default ResponsiveAppBar;
