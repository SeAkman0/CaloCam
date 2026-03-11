import React, { createContext, useState, useContext, useCallback } from 'react';
import CustomAlert from '../components/CustomAlert';

const AlertContext = createContext();

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

export const AlertProvider = ({ children }) => {
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        buttons: [],
    });

    const showAlert = useCallback((title, message, buttons = []) => {
        // Alert.alert format: (title, message, buttons, options)
        // Buttons can be [{ text: 'OK', onPress: () => {}, style: '' }]
        setAlertConfig({
            visible: true,
            title,
            message,
            buttons,
        });
    }, []);

    const hideAlert = useCallback(() => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
    }, []);

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
                onClose={hideAlert}
            />
        </AlertContext.Provider>
    );
};
