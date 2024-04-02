import React, { useState } from 'react';
import { observer } from "mobx-react";
import { Box, Button, CircularProgress, FormControl, Modal, TextField, Typography } from "@mui/material";

export type CreateGroupModalProps = {
    isOpen: boolean;
    handleClose: () => void;
    handleSubmit: (name: string) => Promise<string>;
};

export const CreateGroupModal = observer(function CreateGroupModal(props: CreateGroupModalProps) {
    const [state, setState] = useState<"ready" | "loading" | "success" | "error">("ready");
    const [groupName, setGroupName] = useState("");
    const [message, setMessage] = useState("");

    const handleFormSubmit = async () => {
        if (!props.handleSubmit) {
            console.error("handleSubmit function is not provided");
            return;
        }
        setState("loading");
        try {
            await props.handleSubmit(groupName);
            setState("success");
            setMessage("Skupina vytvořena");
        } catch (error) {
            setState("error");
            setMessage("Něco se pokazilo");
        }
    };

    const closeModal = () => {
        if (state !== "loading") { // Prevent closing if loading
            props.handleClose();
            setTimeout(() => {
                setState("ready"); // Reset state for next opening
                setMessage(""); // Clear message
                setGroupName(""); // Reset form input
            }, 300); // Delay to allow modal close animation
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
            open={props.isOpen}
            onClose={closeModal}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
        >
            <Box sx={style}>
                {state === "ready" && (
                    <FormControl fullWidth>
                        <Typography id="modal-modal-title" variant="h6" component="h2">
                            Vytvořit novou skupinu
                        </Typography>
                        <TextField
                            required
                            id="outlined-required"
                            label="Název"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            margin="normal"
                        />
                        <Box display="flex" justifyContent="space-between" mt={2}>
                            <Button variant="outlined" onClick={closeModal}>Zrušit</Button>
                            <Button variant="contained" onClick={handleFormSubmit}>Vytvořit</Button>
                        </Box>
                    </FormControl>
                )}
                {state === "loading" && (
                    <Box display="flex" justifyContent="center">
                        <CircularProgress />
                    </Box>
                )}
                {(state === "success" || state === "error") && (
                    <Box textAlign="center">
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            {message}
                        </Typography>
                        <Button variant="contained" onClick={closeModal}>Zavřít</Button>
                    </Box>
                )}
            </Box>
        </Modal>
    );
});
