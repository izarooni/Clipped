import { useEffect } from 'react';
import Head from 'next/head';
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
            <Head>
                <title>{`${process.env.NEXT_PUBLIC_WEBSITE_NAME} - or it didn't happen`}</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css" />

                <meta property="og:site_name" content={`${process.env.NEXT_PUBLIC_WEBSITE_NAME}`} />
                <meta property="og:title" content={`${process.env.NEXT_PUBLIC_WEBSITE_NAME} - or it didn't happen`} />

                {(() => {
                    if (!pageProps || !pageProps.video) return;
                    let video = pageProps.video;
                    return (
                        <>
                            < meta property="og:image" content={`${process.env.NEXT_PUBLIC_STREAM_SERVER}/video/preview/${video.ID}?type=image`} />
                            < meta property="og:video" content={`${process.env.NEXT_PUBLIC_STREAM_SERVER}/video/preview/${video.ID}`} />
                            < meta property="og:title" content={`${process.env.NEXT_PUBLIC_WEBSITE_NAME} - or it didn't happen`} />
                            < meta property="og:description" content={`${video.description}`} />
                            < meta name="description" content={`${video.description}`} />
                            < meta property="og:type" content="video" />

                            < meta name="twitter:card" content="summary_large_image" />
                            < meta name="twitter:title" content={`${process.env.NEXT_PUBLIC_WEBSITE_NAME} - or it didn't happen`} />
                            < meta name="twitter:description" content={`${video.description}`} />
                            < meta name="twitter:image" content={`${process.env.NEXT_PUBLIC_STREAM_SERVER}/video/preview/${video.ID}?type=image`} />
                        </>
                    );
                })()}
            </Head>

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
