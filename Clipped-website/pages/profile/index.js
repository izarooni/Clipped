import * as User from '/lib/models/user';

export default function () {
    // nothing needed here
}

export async function getServerSideProps({ req, res }) {
    const redirect = (path) => { return { redirect: { permanent: false, destination: path } } }

    const user = await User.verifyUser(req.cookies.user);
    if (user.error) return redirect('/logout');
    else return redirect(`/profile/${user.username}`);
};
