import React, {ReactNode} from 'react';
import {Route, Routes, BrowserRouter, Navigate} from 'react-router-dom';
import {Home, Login, Mls, Register} from './Pages'
import {Layout} from "./Components";
import {useInitialRootStore, useStores} from "./models/helpers/useStores";
import {observer} from "mobx-react";

interface RouteProps {
    children: ReactNode;
}

const App = observer(function App()
{
    // load persisted state if possible
    useInitialRootStore()

    const {authStore} = useStores()

    const GuestRoute: React.FC<RouteProps> = ({ children }) => {

        if (authStore.isAuthenticated()) {
            // Redirect to the home page if logged in
            return <Navigate to="/home" replace />;
        }

        return <>{children}</>; // Wrapped children in fragment for explicit return
    };

    const ProtectedRoute: React.FC<RouteProps> = ({ children }) => {
        if (!authStore.isAuthenticated()) {
            // Redirect to the login page if not logged in
            return <Navigate to="/login" replace />;
        }

        return <>{children}</>; // Wrapped children in fragment for explicit return
    };


    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    {/* Apply ProtectedRoute for authenticated routes */}
                    <Route index path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                    <Route path="/mls" element={<ProtectedRoute><Mls /></ProtectedRoute>} />

                    {/* Apply GuestRoute for login and register */}
                    <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
                    <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
})

export default App;