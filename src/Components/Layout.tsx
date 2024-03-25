import * as React from 'react';
import { Outlet } from 'react-router-dom';
import ResponsiveAppBar from './AppBar'; // Adjust the import path as needed

const Layout: React.FC = () => {
    return (
        <>
            <ResponsiveAppBar />
            <Outlet />
        </>
    );
}

export default Layout;