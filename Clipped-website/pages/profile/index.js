import * as User from '/lib/models/user';
import Alert from '/components/alert';
import Navbar from '/components/navbar';

export default function Profile({ error }) {
    // display a front-end error in case the profile can't be loaded
    return (
        <div className="flex">
            <Navbar />
            <div className="container mx-auto">
                <Alert message={error} className="absolute top-24 md:right-6 md:w-1/2" />
            </div>
        </div>
    );
}

export async function getServerSideProps({ req, res }) {
    const redirect = (path) => { return { redirect: { permanent: false, destination: path } } }

    try {
        const user = await User.verifyUser(req.cookies.user);
        if (!user || user.error) return redirect('/logout');
        else return redirect(`/profile/${user.username}`);
    } catch (error) {
        return { props: { error: `Failed to load profile ${error.message}` } };
    }
};
