import { useEffect, useState } from "react";
import { AuthContext } from "./auth.context.js";
import { getMe } from "./services/auth.api.js";

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true;

        const loadUser = async () => {
            try {
                const data = await getMe();
                if (isMounted) setUser(data.user);
            } catch {
                if (isMounted) setUser(null);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadUser();
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <AuthContext.Provider value={{user, setUser, loading, setLoading}}>
            {children}
        </AuthContext.Provider>
    )
}