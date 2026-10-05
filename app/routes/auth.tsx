import {usePuterStore} from "~/lib/puter";
import {useLocation, useNavigate} from "react-router";
import {useEffect} from "react";

export const meta = () => ([
    {title : 'Resumind|Auth'},
    {name : 'description', content :'log into your account.'},
])

const Auth = () =>{
    const {isLoading, auth} = usePuterStore();
    const location = useLocation();
    const next = location.search.split('next=')[1];
    const navigate = useNavigate();

    useEffect(() => {
        if(auth.isAuthenticated) navigate(next);
    }, [auth.isAuthenticated, next])

    return(
        <main className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-screen flex items-center justify-center">
            <div className="gradient-border max-sm:w-[calc(100%-2rem)] max-sm:p-3 shadow-lg">
                <section className="flex flex-col gap-8 max-sm:gap-6 bg-white rounded-2xl p-10 max-sm:p-5">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <h1>WELCOME</h1>
                        <h2>Login to continue your Job Journey</h2>
                    </div>
                    <div>
                        {isLoading ? (
                            <button className="auth-button animate-pulse">
                                <p>Signing you in...</p>
                            </button>
                        ): (
                                <>
                                    {auth.isAuthenticated ? (
                                        <button className="auth-button" onClick={async () => {
                                            await auth.signOut();
                                            navigate("/", { replace: true });
                                        }}>
                                            <p>Log Out</p>
                                        </button>
                                    ):(
                                        <button className="auth-button" onClick={auth.signIn}>
                                            <p>Log In</p>
                                        </button>
                                    )}
                                </>
                            )}
                    </div>
                </section>
            </div>
        </main>
    )
}
export default Auth
