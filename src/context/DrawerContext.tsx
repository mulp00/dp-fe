import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the context type
type DrawerContextType = {
    isDrawerOpen: boolean;
    toggleDrawer: () => void;
};

// Create context with the defined type, set initial value to undefined to enforce provider usage
const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export const useDrawer = () => {
    const context = useContext(DrawerContext);
    if (context === undefined) {
        throw new Error('useDrawer must be used within a DrawerProvider');
    }
    return context;
};

type DrawerProviderProps = {
    children: ReactNode;
};

export const DrawerProvider: React.FC<DrawerProviderProps> = ({ children }) => {
    const [isDrawerOpen, setDrawerOpen] = useState(false);

    const toggleDrawer = () => {
        setDrawerOpen(!isDrawerOpen);
    };

    return (
        <DrawerContext.Provider value={{ isDrawerOpen, toggleDrawer }}>
            {children}
        </DrawerContext.Provider>
    );
};
