import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const CustomAlert = ({
    visible,
    title,
    message,
    buttons = [],
    onClose,
}) => {
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0.8);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
                    <TouchableOpacity
                        activeOpacity={1}
                        style={styles.backdropClick}
                        onPress={buttons.length <= 1 ? onClose : null}
                    />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.alertBox,
                        {
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {Platform.OS === 'ios' ? (
                        <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
                            <AlertContent title={title} message={message} buttons={buttons} onClose={onClose} />
                        </BlurView>
                    ) : (
                        <View style={[styles.blurContainer, styles.androidBg]}>
                            <AlertContent title={title} message={message} buttons={buttons} onClose={onClose} />
                        </View>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
};

const AlertContent = ({ title, message, buttons, onClose }) => {
    const renderIcon = () => {
        if (title?.toLowerCase().includes('hata') || title?.toLowerCase().includes('dikkat') || title?.toLowerCase().includes('durma')) {
            return <Ionicons name="warning-outline" size={40} color="#ff6b6b" style={styles.icon} />;
        }
        if (title?.toLowerCase().includes('başarılı') || title?.toLowerCase().includes('harika') || title?.toLowerCase().includes('tamam')) {
            return <Ionicons name="checkmark-circle-outline" size={40} color="#4CAF50" style={styles.icon} />;
        }
        if (title?.toLowerCase().includes('bilgi') || title?.toLowerCase().includes('sorgula') || title?.toLowerCase().includes('bulunamadı')) {
            return <Ionicons name="information-circle-outline" size={40} color="#4FC3F7" style={styles.icon} />;
        }
        return <Ionicons name="notifications-outline" size={40} color="#fff" style={styles.icon} />;
    };

    return (
        <View style={styles.content}>
            {renderIcon()}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <View style={styles.buttonContainer}>
                {buttons.length > 0 ? (
                    buttons.map((btn, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.button,
                                index === buttons.length - 1 && styles.primaryButton,
                                btn.style === 'cancel' && styles.cancelButton,
                                buttons.length > 2 && { width: '100%', marginBottom: 8 }
                            ]}
                            onPress={() => {
                                if (btn.onPress) btn.onPress();
                                onClose();
                            }}
                        >
                            <Text style={[
                                styles.buttonText,
                                index === buttons.length - 1 && styles.primaryButtonText,
                                btn.style === 'cancel' && styles.cancelButtonText
                            ]}>
                                {btn.text}
                            </Text>
                        </TouchableOpacity>
                    ))
                ) : (
                    <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={onClose}>
                        <Text style={[styles.buttonText, styles.primaryButtonText]}>Tamam</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    backdropClick: {
        flex: 1,
    },
    alertBox: {
        width: width * 0.85,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    blurContainer: {
        padding: 24,
        alignItems: 'center',
    },
    androidBg: {
        backgroundColor: '#1a1a2e',
        borderWidth: 1,
        borderColor: '#2a3447',
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    icon: {
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 12,
    },
    message: {
        fontSize: 15,
        color: '#b4b4b4',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        flexWrap: 'wrap',
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        minWidth: 100,
    },
    primaryButton: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    cancelButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    primaryButtonText: {
        color: '#fff',
    },
    cancelButtonText: {
        color: '#ef4444',
    },
});

export default CustomAlert;
