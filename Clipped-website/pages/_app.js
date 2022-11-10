import { useEffect } from 'react';
import Footer from '/components/footer';
import NavbarButton from '/components/navbar-toggle';
import AccountButton from '/components/account-button';

import '../styles/globals.css';

export default function MyApp({ Component, pageProps }) {
    useEffect(() => {
        window.ondrop = (e) => e.preventDefault();
        window.ondragover = (e) => e.preventDefault();
    }, []);

    return (
        <>
            <main>
                {/* horizontal bar */}
                <div className="z-40 xl:z-50 sticky top-0 flex justify-between items-center shadow bg-zinc-900">
                    <NavbarButton />
                    <AccountButton />
                </div>

                <Component {...pageProps} />
            </main>
            <Footer />
        </>
    )
}
