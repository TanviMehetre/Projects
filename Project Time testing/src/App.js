import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./pages/Root";
import ListPage from "./pages/ListPage";
import DetailsPage from "./pages/DetailsPage";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        children: [
            {
                index: true,
                element: <ListPage />,
            },
            {
                path: "edit/:id",
                element: <DetailsPage key="edit-mode" />,
            },
            {
                path: "view/:id",
                element: <DetailsPage key="view-mode" />,
            },
            {
                path: "create/",
                element: <DetailsPage key="create-mode" />,
            },
        ],
    },
]);

function App() {
    return <RouterProvider router={router} />;
}

export default App;
