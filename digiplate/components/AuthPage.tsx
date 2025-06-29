import React, { useState } from 'react';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    updatePassword
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Invite } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

type AuthMode = 'login' | 'signup';

const AuthPage: React.FC = () => {
    const { t } = useTranslation();
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [isForcingPasswordChange, setIsForcingPasswordChange] = useState(false);
    const [pendingInvite, setPendingInvite] = useState<Invite | null>(null);


    const handleSetNewPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pendingInvite || !newPassword) return;

        setLoading(true);
        setError('');

        try {
            // First, create the user with the temporary password to get a user object
            const userCredential = await createUserWithEmailAndPassword(auth, pendingInvite.email, pendingInvite.temporaryPassword!);
            // Immediately update their password to the new one they've set
            await updatePassword(userCredential.user, newPassword);
            
            // The onAuthStateChanged listener in App.tsx will handle the rest:
            // creating the staff document and deleting the invite.
            // We don't need to do anything else here.
        } catch (err) {
            const authError = err as { code: string; message: string; };
            console.error("Error during password change creation:", authError);
            setError(t('auth_error_set_password') + authError.message);
            setIsForcingPasswordChange(false);
            setPendingInvite(null);
        } finally {
            setLoading(false);
        }
    }


    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (mode === 'login') {
                await signInWithEmailAndPassword(auth, email, password);
            } else if (mode === 'signup') {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            const authError = err as { code: string; message: string; };
            
            // Special flow for new staff members using a temporary password
            if (mode === 'login' && (authError.code === 'auth/wrong-password' || authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential')) {
                try {
                    const inviteRef = doc(db, 'invites', email);
                    const inviteSnap = await getDoc(inviteRef);

                    if (inviteSnap.exists() && inviteSnap.data().temporaryPassword === password) {
                        setPendingInvite(inviteSnap.data() as Invite);
                        setIsForcingPasswordChange(true);
                        setError(''); // Clear previous login error
                        setLoading(false);
                        return; // Stop execution to show password change screen
                    }
                } catch (inviteError) {
                    console.error("Error checking for invite:", inviteError);
                }
            }
            
            // Standard error handling
            switch(authError.code) {
                case 'auth/user-not-found':
                case 'auth/invalid-credential':
                    setError(t('auth_error_no_account'));
                    break;
                case 'auth/wrong-password':
                    setError(t('auth_error_wrong_password'));
                    break;
                case 'auth/email-already-in-use':
                    setError(t('auth_error_email_exists'));
                    break;
                default:
                    setError(authError.message);
                    break;
            }
        } finally {
            setLoading(false);
        }
    };
    
    const getTitle = () => {
        if (isForcingPasswordChange) return t('auth_new_password_title');
        switch(mode) {
            case 'login': return t('auth_sign_in_title');
            case 'signup': return t('auth_sign_up_title');
        }
    }

    const renderForcePasswordChange = () => (
        <form className="mt-8 space-y-6" onSubmit={handleSetNewPassword}>
            <p className="text-center text-brand-gray-600 dark:text-brand-gray-400">{t('auth_welcome_message', pendingInvite?.name || pendingInvite?.email || '')}</p>
            <div className="rounded-md shadow-sm -space-y-px">
                <div>
                    <label htmlFor="new-password" className="sr-only">{t('auth_new_password_placeholder')}</label>
                    <input
                        id="new-password"
                        name="new-password"
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-brand-gray-300 dark:border-brand-gray-600 placeholder-brand-gray-500 text-brand-gray-900 dark:text-white dark:bg-brand-gray-700 focus:outline-none focus:ring-brand-teal focus:border-brand-teal focus:z-10 sm:text-sm"
                        placeholder={t('auth_new_password_placeholder')}
                    />
                </div>
            </div>
             {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <div>
                <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-teal hover:bg-brand-teal-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal-dark disabled:bg-teal-300"
                >
                    {loading ? t('auth_setting_password_button') : t('auth_set_password_button')}
                </button>
            </div>
        </form>
    );

    const renderDefaultAuth = () => (
         <>
            <form className="mt-8 space-y-6" onSubmit={handleAuthAction}>
                <div className="rounded-md shadow-sm -space-y-px">
                    <div>
                        <label htmlFor="email-address" className="sr-only">{t('auth_email_placeholder')}</label>
                        <input
                            id="email-address"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-brand-gray-300 dark:border-brand-gray-600 placeholder-brand-gray-500 text-brand-gray-900 dark:text-white dark:bg-brand-gray-700 rounded-t-md focus:outline-none focus:ring-brand-teal focus:border-brand-teal focus:z-10 sm:text-sm"
                            placeholder={t('auth_email_placeholder')}
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="sr-only">{t('auth_password_placeholder')}</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-brand-gray-300 dark:border-brand-gray-600 placeholder-brand-gray-500 text-brand-gray-900 dark:text-white dark:bg-brand-gray-700 rounded-b-md focus:outline-none focus:ring-brand-teal focus:border-brand-teal focus:z-10 sm:text-sm"
                            placeholder={t('auth_password_placeholder')}
                        />
                    </div>
                </div>

                {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-teal hover:bg-brand-teal-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal-dark disabled:bg-teal-300"
                    >
                        {loading ? t('auth_processing') : (mode === 'login' ? t('auth_sign_in_button') : t('auth_sign_up_button'))}
                    </button>
                </div>
            </form>
            <div className="text-sm text-center">
                <button
                    onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
                    className="font-medium text-brand-teal hover:text-brand-teal-dark"
                >
                    {mode === 'login' ? t('auth_switch_to_signup') : t('auth_switch_to_signin')}
                </button>
            </div>
         </>
    );

    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-gray-50 dark:bg-brand-gray-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-brand-gray-800 rounded-xl shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-wider text-brand-teal">
                        DIGI<span className="text-brand-gray-800 dark:text-white">PLATE</span>
                    </h1>
                    <p className="mt-2 text-sm text-brand-gray-600 dark:text-brand-gray-400">
                        {getTitle()}
                    </p>
                </div>
                {isForcingPasswordChange ? renderForcePasswordChange() : renderDefaultAuth() }
            </div>
        </div>
    );
};

export default AuthPage;
