import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
    return (
        <Html>
            <Head>
                <title>{`${process.env.NEXT_PUBLIC_WEBSITE_NAME} - or it didn't happen`}</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css" />

                <meta property="og:site_name" content={`${process.env.NEXT_PUBLIC_WEBSITE_NAME}`} />
                <meta property="og:title" content={`${process.env.NEXT_PUBLIC_WEBSITE_NAME} - or it didn't happen`} />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}