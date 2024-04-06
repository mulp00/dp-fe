import React, { useState } from 'react';
import {
    Alert, Box, Button, CircularProgress, Modal, Snackbar, TextField, Typography
} from '@mui/material';
import { z } from 'zod';
import { GroupSnapshotIn } from "../../models/Group/GroupModel";
import { GroupItemSnapshotIn } from "../../models/GroupItem/GroupItemModel";

interface AddItemModalProps {
    isOpen: boolean;
    handleClose: () => void;
    group: GroupSnapshotIn;
    type: string; // Type is now passed as a prop
    onItemCreate: (group: GroupSnapshotIn, groupItem: GroupItemSnapshotIn) => Promise<boolean>;
    onFeedback: (type: 'success' | 'error', message: string) => void; // Callback for passing feedback up
}

const loginSchema = z.object({
    username: z.string().min(1, "Uživatelské jméno je povinné"),
    password: z.string().min(1, "Heslo je povinné"),
    notes: z.string().optional(),
});

const cardSchema = z.object({
    cardNumber: z.string().min(1, "Číslo karty je povinné"),
    expiration: z.string().min(1, "Datum expirace je povinné"),
    cvv: z.string().min(1, "CVV je povinné"),
    cardholderName: z.string().min(1, "Jméno držitele karty je povinné"),
    notes: z.string().optional(),
});

export const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, handleClose, group, type, onItemCreate, onFeedback }) => {
    const [name, setName] = useState('');
    const [loginDetails, setLoginDetails] = useState({ username: '', password: '', notes: '' });
    const [cardDetails, setCardDetails] = useState({ cardNumber: '', expiration: '', cvv: '', cardholderName: '', notes: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            let content = '';
            if (type === 'login') {
                const parsedLoginDetails = loginSchema.parse(loginDetails);
                content = JSON.stringify(parsedLoginDetails);
            } else if (type === 'card') {
                const parsedCardDetails = cardSchema.parse(cardDetails);
                content = JSON.stringify(parsedCardDetails);
            }

            const item: GroupItemSnapshotIn = {
                name,
                groupId: group.groupId,
                type,
                content,
                id: ""
            };

            const success = await onItemCreate(group, item);
            if (success) {
                onFeedback('success', 'Položka byla úspěšně přidána.');
                resetForm();
            } else {
                onFeedback('error', 'Přidání položky selhalo. Zkuste to prosím znovu.');
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                onFeedback('error', 'Ověření selhalo. Zkontrolujte prosím svůj vstup.');
            } else {
                onFeedback('error', 'Došlo k neočekávané chybě.');
            }
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setLoginDetails({ username: '', password: '', notes: '' });
        setCardDetails({ cardNumber: '', expiration: '', cvv: '', cardholderName: '', notes: '' });
        handleClose();
    };

    const style = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
    };

    return (
        <Modal open={isOpen} onClose={handleClose}>
            <Box sx={style}>
                <Typography id="modal-title" variant="h6" component="h2">
                    Přidat novou položku
                </Typography>
                <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
                    <TextField fullWidth margin="normal" label="Název" value={name} onChange={(e) => setName(e.target.value)} />
                    {type === 'login' && (
                        <>
                            <TextField fullWidth margin="normal" label="Uživatelské jméno" value={loginDetails.username} onChange={(e) => setLoginDetails({ ...loginDetails, username: e.target.value })} />
                            <TextField fullWidth margin="normal" label="Heslo" type="password" value={loginDetails.password} onChange={(e) => setLoginDetails({ ...loginDetails, password: e.target.value })} />
                            <TextField fullWidth margin="normal" label="Poznámky" value={loginDetails.notes} onChange={(e) => setLoginDetails({ ...loginDetails, notes: e.target.value })} />
                        </>
                    )}
                    {type === 'card' && (
                        <>
                            <TextField fullWidth margin="normal" label="Číslo karty" value={cardDetails.cardNumber} onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value })} />
                            <TextField fullWidth margin="normal" label="Datum expirace" value={cardDetails.expiration} onChange={(e) => setCardDetails({ ...cardDetails, expiration: e.target.value })} />
                            <TextField fullWidth margin="normal" label="CVV" value={cardDetails.cvv} onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })} />
                            <TextField fullWidth margin="normal" label="Jméno držitele karty" value={cardDetails.cardholderName} onChange={(e) => setCardDetails({ ...cardDetails, cardholderName: e.target.value })} />
                            <TextField fullWidth margin="normal" label="Poznámky" value={cardDetails.notes} onChange={(e) => setCardDetails({ ...cardDetails, notes: e.target.value })} />
                        </>
                    )}
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? <CircularProgress size={24} /> : 'Odeslat'}
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Modal>
    );
};
