import React, {useState} from 'react';
import {
    Box,
    Button, Chip,
    Container, Divider, FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    OutlinedInput,
    TextField,
    Typography
} from '@mui/material';
import api, {LoginPayload} from "../services/api";
// import * as mfkdf from '../utils/crypto/mfkdf/mfkdf.min'
import {useStores} from "../models/helpers/useStores";
import {useApiService} from "../hooks";
import {useNavigate} from "react-router-dom";
import {observer} from "mobx-react";
import {applySnapshot} from "mobx-state-tree";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import {ab2str, decryptStringWithAesCtr, importAesKey} from "../utils/crypto/aes/encryption";

const mfkdf = require('mfkdf/mfkdf');

export interface LoginState {
    email: string;
    password: string;
    totp: string; // For TOTP code input
}

export const Login = observer(function Login() {
    const {authStore, userStore} = useStores()
    const apiService = useApiService()
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = React.useState(false);

    const handleClickShowPassword = () => setShowPassword((show) => !show);

    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };


    const [state, setState] = useState<LoginState>({
        email: '',
        password: '',
        totp: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setState(prevState => ({...prevState, [name]: value}));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const policy = await apiService.getPolicy({email: state.email})

        const derive = await mfkdf.derive.key(policy, {
            password: mfkdf.derive.factors.password(state.password),
            totp: mfkdf.derive.factors.totp(Number(state.totp)),
        })

        const key = derive.key

        const aesKey = await importAesKey(derive.key);

        const payload: LoginPayload = {
            email: state.email,
            masterKeyHash: ab2str(await crypto.subtle.digest("SHA-256", key)),
        };

        try {
            const loginResponse = await apiService.login(payload);
            authStore.setAuthToken(loginResponse.token);
            authStore.setKey(key);
            apiService.setAuthToken(loginResponse.token);

            const meResponse = await apiService.getMe();

            const decryptedSerializedIdentity = await decryptStringWithAesCtr(meResponse.serializedIdentity.ciphertext, aesKey, meResponse.serializedIdentity.iv)
            const decryptedKeyStore = await decryptStringWithAesCtr(meResponse.keyStore.ciphertext, aesKey, meResponse.keyStore.iv)

            applySnapshot(userStore.me, {
                ...meResponse,
                serializedIdentity: decryptedSerializedIdentity,
                keyPackage: meResponse.keyPackage,
                keyStore: decryptedKeyStore
            })
            navigate("/home")

        } catch (error) {
            console.error('Login failed:', error);
            alert('Login failed');
        }
    };

    return (
        <Box display="flex" alignItems="center" justifyContent="center" minHeight="75vh">
            <Container component="main" maxWidth="xs">
                <Typography component="h1" variant="h5">Přihlášení</Typography>
                <form onSubmit={handleSubmit}>
                    <TextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        label="Email"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={state.email}
                        onChange={handleChange}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel htmlFor="password">Heslo</InputLabel>
                        <OutlinedInput
                            id="password"
                            required
                            fullWidth
                            label="Heslo"
                            name="password"
                            value={state.password}
                            onChange={handleChange}
                            type={showPassword ? 'text' : 'password'}
                            endAdornment={
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="toggle password visibility"
                                        onClick={handleClickShowPassword}
                                        onMouseDown={handleMouseDownPassword}
                                        edge="end"
                                    >
                                        {showPassword ? <VisibilityOff/> : <Visibility/>}
                                    </IconButton>
                                </InputAdornment>
                            }
                        />
                    </FormControl>
                    <FormControl fullWidth>
                        <TextField
                            variant="outlined"
                            margin="normal"
                            required
                            fullWidth
                            label="Ověřovací kód"
                            name="totp"
                            value={state.totp}
                            onChange={handleChange}
                        />
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                    <Button type="submit" fullWidth variant="contained" color="primary">
                            Přihlásit
                        </Button>
                    </FormControl>
                </form>
                <Divider sx={{marginY: 3}}>
                    <Chip label="Nemáte účet?" size="small" />
                </Divider>
                <Button  fullWidth variant="outlined" color="primary" onClick={()=>navigate('/register')}>
                    Registrovat
                </Button>
            </Container>
        </Box>
    );
});