import React, { useState } from 'react';
import { observer } from "mobx-react";
import { Box, Button, CircularProgress, FormControl, Modal, TextField, Typography } from "@mui/material";

export type CreateGroupModalProps = {
    isOpen: boolean;
    handleClose: () => void;
    handleSubmit: (name: string) => Promise<void>;
    onFeedback: (type: 'success' | 'error', message: string) => void;
};

export const CreateGroupModal = observer(function CreateGroupModal({ isOpen, handleClose, handleSubmit, onFeedback }: CreateGroupModalProps) {
    const [loading, setLoading] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [groupNameError, setGroupNameError] = useState("");

    const validateGroupName = (name: string) => {
        if (name.length >= 4) {
            setGroupNameError("");
            return true;
        } else {
            setGroupNameError("Název skupiny musí být alespoň 4 znaky dlouhý.");
            return false;
        }
    };

    const handleFormSubmit = async () => {
        if (!validateGroupName(groupName)) {
            return;
        }
        setLoading(true);
        try {
            await handleSubmit(groupName);
            onFeedback('success', 'Skupina vytvořena');
        } catch (error) {
            onFeedback('error', 'Něco se pokazilo');
        } finally {
            setLoading(false);
            handleCloseModal();
        }
    };

    const handleCloseModal = () => {
        if (!loading) { // Prevent closing if loading
            handleClose();
            setTimeout(() => {
                setGroupName("");
                setGroupNameError("");
            }, 300);
        }
    };

    const style = {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
    };

    return (
        <Modal
            open={isOpen}
            onClose={handleCloseModal}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
        >
            <Box sx={style}>
                <FormControl fullWidth>
                    <Typography id="modal-modal-title" variant="h6" component="h2">
                        Vytvořit novou skupinu
                    </Typography>
                    <TextField
                        required
                        label="Název"
                        value={groupName}
                        onChange={(e) => {
                            setGroupName(e.target.value);
                            validateGroupName(e.target.value); // Validate on change
                        }}
                        margin="normal"
                        error={!!groupNameError}
                        helperText={groupNameError}
                    />
                    <Box display="flex" justifyContent="space-between" mt={2}>
                        <Button variant="outlined" onClick={handleCloseModal}>Zrušit</Button>
                        <Button variant="contained" onClick={handleFormSubmit} disabled={loading}>
                            {loading ? <CircularProgress size={24} /> : 'Vytvořit'}
                        </Button>
                    </Box>
                </FormControl>
            </Box>
        </Modal>
    );
});