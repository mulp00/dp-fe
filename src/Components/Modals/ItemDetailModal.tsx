import React, {useEffect, useState} from 'react';
import {Box, Button, CircularProgress, IconButton, Modal, TextField, Typography} from '@mui/material';
import {GroupItemSnapshotIn} from "../../models/GroupItem/GroupItemModel";
import {cardSchema, loginSchema} from "./AddItemModal";
import {useStores} from "../../models/helpers/useStores";
import {ConfirmModal} from "./ConfirmModal";
import CloseIcon from "@mui/icons-material/Close";
import {getSnapshot} from "mobx-state-tree";

interface ItemDetailModalProps {
    isOpen: boolean;
    onHandleClose: () => void;
    groupItem: GroupItemSnapshotIn
    onUpdateItem: (groupItem: GroupItemSnapshotIn) => Promise<boolean>;
    onFeedback: (type: 'success' | 'error', message: string) => void;
    onDeleteItem: (groupItemId: string) => Promise<boolean>
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
                                                                    isOpen,
                                                                    onHandleClose,
                                                                    groupItem,
                                                                    onUpdateItem,
                                                                    onFeedback,
                                                                    onDeleteItem
                                                                }) => {
    const [details, setDetails] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string> | null>({});
    const {groupStore} = useStores();

    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState<boolean>(false)

    const groupItemSnapshot = groupItem

    useEffect(() => {
        if (isOpen) {
            try {
                const parsedContent = groupItemSnapshot.content ? JSON.parse(groupItemSnapshot.content.ciphertext) : {};
                setDetails({
                    ...parsedContent,
                    name: groupItemSnapshot.name,
                    description: groupItemSnapshot.description
                });
            } catch (error) {
                console.error("Failed to parse item content", error);
                onFeedback('error', 'Chyba při načítání detailů položky.');
            }
        }
    }, [ isOpen, onFeedback]);


    const handleSubmit = async () => {
        setLoading(true);
        setErrors({}); // Reset errors before validation

        const schema = groupItemSnapshot.type === 'login' ? loginSchema : cardSchema;
        const validationResult = schema.safeParse(details);
        if (!validationResult.success) {
            // Accumulate all errors into the errors state
            const newErrors = validationResult.error.issues.reduce((acc, curr) => {
                acc[curr.path[0]] = curr.message;
                return acc;
            }, {} as Record<string, string>);
            setErrors(newErrors);
            setLoading(false);
            return;
        }

        try {
            const updatedItem: GroupItemSnapshotIn = {
                ...groupItemSnapshot,
                content: {ciphertext: JSON.stringify(validationResult.data), iv: groupItemSnapshot.content.iv},
                name: details.name,
                description: details.description
            };

            const success = await onUpdateItem(updatedItem);
            if (success) {
                onFeedback('success', 'Položka byla úspěšně aktualizována.');
                closeModal();
            } else {
                onFeedback('error', 'Aktualizace položky selhala. Zkuste to prosím znovu.');
            }
        } catch (error) {
            onFeedback('error', 'Došlo k neočekávané chybě.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setDetails({...details, [field]: e.target.value});
    };

    const closeModal = () => {
        onHandleClose();
        setTimeout(() => {
            setErrors(null)
            setDetails({});
        }, 300); // Delay to allow modal close animation
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
        <Modal open={isOpen} onClose={closeModal}>
            <Box>
                <ConfirmModal
                    isOpen={isDeleteConfirmModalOpen}
                    onHandleClose={() => {
                        setIsDeleteConfirmModalOpen(false)
                        closeModal()
                    }}
                    onHandleSubmit={async ()=> {
                        await onDeleteItem(groupItemSnapshot.groupId)
                    }}
                    title={"Opravdu chcete položku smazat"}
                    text={""}
                    successMessage={"Položka smazána"}
                    onFeedback={onFeedback}
                    confirmText="Smazat"
                />
                <Box sx={style}>
                    <IconButton sx={{position: "fixed", top: 5, right: 5}} onClick={()=> {
                        closeModal()
                    }}>
                        <CloseIcon/>
                    </IconButton>
                    <Typography id="modal-title" variant="h6" component="h2">
                        Detail
                    </Typography>
                    <Box component="form" noValidate autoComplete="off" sx={{mt: 2}}>
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Název"
                            value={details?.name || ''}
                            onChange={handleChange('name')}
                            error={!!errors?.name}
                            helperText={errors?.name || ''}
                        />
                        {groupItemSnapshot.type === 'login' && (
                            <>
                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="Uživatelské jméno"
                                    value={details?.username || ''}
                                    onChange={handleChange('username')}
                                    error={!!errors?.username}
                                    helperText={errors?.username || ''}
                                />
                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="Heslo"
                                    value={details?.password || ''}
                                    onChange={handleChange('password')}
                                    error={!!errors?.password}
                                    helperText={errors?.password || ''}
                                />
                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="Popis"
                                    value={details?.description || ''}
                                    onChange={handleChange('description')}
                                    error={!!errors?.description}
                                    helperText={errors?.description || ''}
                                />
                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="Poznámky"
                                    value={details?.notes || ''}
                                    onChange={handleChange('notes')}
                                    error={!!errors?.notes}
                                    helperText={errors?.notes || ''}
                                />
                            </>
                        )}
                        {groupItemSnapshot.type === 'card' && (
                            <>
                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="Číslo karty"
                                    value={details?.cardNumber || ''}
                                    onChange={handleChange('cardNumber')}
                                    error={!!errors?.cardNumber}
                                    helperText={errors?.cardNumber || ''}
                                />
                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="Datum expirace"
                                    value={details?.expiration || ''}
                                    onChange={handleChange('expiration')}
                                    error={!!errors?.expiration}
                                    helperText={errors?.expiration || ''}
                                />
                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="CVV"
                                    value={details?.cvv || ''}
                                    onChange={handleChange('cvv')}
                                    error={!!errors?.cvv}
                                    helperText={errors?.cvv || ''}
                                />
                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="Jméno držitele karty"
                                    value={details?.cardholderName || ''}
                                    onChange={handleChange('cardholderName')}
                                    error={!!errors?.cardholderName}
                                    helperText={errors?.cardholderName || ''}
                                />
                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="Popis"
                                    value={details?.description || ''}
                                    onChange={handleChange('description')}
                                    error={!!errors?.description}
                                    helperText={errors?.description || ''}
                                />
                                <TextField
                                    fullWidth
                                    margin="normal"
                                    label="Poznámky"
                                    value={details?.notes || ''}
                                    onChange={handleChange('notes')}
                                    error={!!errors?.notes}
                                    helperText={errors?.notes || ''}
                                />
                            </>
                        )}

                        <Box sx={{mt: 3, display: 'flex', justifyContent: 'space-between'}}>
                            <Button variant="outlined" onClick={handleSubmit} disabled={loading}>
                                {loading ? <CircularProgress size={24}/> : 'Aktualizovat'}
                            </Button>
                            <Button variant="contained" color="error" onClick={async() => {
                                setIsDeleteConfirmModalOpen(true)
                            }}>
                                Smazat
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Modal>

    );
};
