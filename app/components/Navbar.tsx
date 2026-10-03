import {Link, useLocation} from "react-router";

// @ts-ignore
const Navbar = () =>{
    const { pathname } = useLocation();

    return(
        <nav className="navbar">
            <Link to="/">
                <p className="text-2xl font-bold text-gradient">RESUMIND</p>
            </Link>
            <div className="flex items-center gap-3">
                {pathname !== "/wipe" && (
                    <Link to="/wipe" className="primary-button w-fit whitespace-nowrap px-3 py-1.5">
                        Storage and Cleanup
                    </Link>
                )}
                <Link to="/upload" className="primary-button w-fit whitespace-nowrap px-3 py-1.5">
                    Upload Resume
                </Link>
            </div>
        </nav>
    )
}
export default Navbar
