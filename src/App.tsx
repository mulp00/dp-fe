import React from 'react';
import {Route, Routes, BrowserRouter} from 'react-router-dom';
import {Login, Mls, Register} from './Pages'
import {Layout} from "./Components";
// Import other components like Home and Login
import * as mfkdf from './utils/crypto/mfkdf/mfkdf.min'


export default function App() {



    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index path="register" element={<Register/>} />
                    <Route path="login" element={<Login />} />
                    <Route path="mls" element={<Mls />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
