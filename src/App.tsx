import React, {ReactNode} from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {Home, Login, Register} from './Pages'
import {Layout} from './Components'
import {useInitialRootStore, useStores} from "./models/helpers/useStores";
import {observer} from "mobx-react";
import {DrawerProvider} from "./context/DrawerContext";

interface RouteProps {
    children: ReactNode;
}

const App = observer(function App() {
    // load persisted state if possible
    useInitialRootStore()

    const {authStore} = useStores()

    const GuestRoute: React.FC<RouteProps> = ({children}) => {

        if (authStore.isAuthenticated()) {
            // Redirect to the home page if logged in
            return <Navigate to="/home" replace/>;
        }

        return <>{children}</>;
    };

    const ProtectedRoute: React.FC<RouteProps> = ({children}) => {
        if (!authStore.isAuthenticated()) {
            // Redirect to the login page if not logged in
            return <Navigate to="/login" replace/>;
        }

        return <>{children}</>;
    };


    return (
        <BrowserRouter>
            <DrawerProvider>
                <Routes>
                    <Route path="/" element={<Layout/>}>
                        <Route index element={authStore.isAuthenticated() ? <Navigate to="/home" replace/> :
                            <Navigate to="/login" replace/>}/>

                        <Route path="/home" element={<ProtectedRoute><Home/></ProtectedRoute>}/>

                        <Route path="/login" element={<GuestRoute><Login/></GuestRoute>}/>
                        <Route path="/register" element={<GuestRoute><Register/></GuestRoute>}/>
                    </Route>
                </Routes>
            </DrawerProvider>
        </BrowserRouter>
    );
})

export default App;