# Project Setup: Drid Backend for Blog

## Prerequisites
1. Ensure you have [Node.js](https://nodejs.org/) installed.
2. Install [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/).
3. Set up a database MONGODB.

## Installation
1. Clone the repository:
    ```bash
    git clone https://github.com/unibeninterns/server.git
    cd server
    ```

2. Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

## Configuration
1. Create a `.env` file in the root directory of the project.
2. Add the following environment variables to the `.env` file:

    ```env
        NODE_ENV=
        MONGODB_URI=
        FRONTEND_URL=
        LOG_LEVEL=
        PORT=
        JWT_ACCESS_SECRET=
        JWT_REFRESH_SECRET=
        SMTP_HOST=
        SMTP_PORT=
        SMTP_USER=
        SMTP_PASS=
        EMAIL_FROM=
        PASSWORD_PEPPER=
        ADMIN_NAME=
        ADMIN_EMAIL=
        ADMIN_PASSWORD=
        API_URL = #this is important. It is the url for the hosted server. E.g if the server is hosted at https://example.com, its value should be https://example.com
    ```

    Replace the placeholder values with your actual configuration.

## Running the Project
1. Start the development server:
    ```bash
    npm run dev
    # or
    yarn dev
    ```

2. Access the application at `http://localhost:3000`.

## Testing
Run the test suite:
```bash
npm test
# or
yarn test
```

## Additional Notes
- Ensure your database is running and accessible before starting the server.
- For production, update the `NODE_ENV` and other sensitive configurations accordingly.


## Deployment
For production deployment, ensure the following:

1. Set `NODE_ENV` to `production`.
2. Use a secure MongoDB URI.
3. Use strong secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
4. Configure a production-ready SMTP server.

## License
This project is licensed under the ISC License.

## Authors
- Raymond Omoyakhi ([raymondomoyakhi@gmail.com](mailto:raymondomoyakhi@gmail.com))
- Udezue Oluomachi ([basilchimaobi2@gmail.com](mailto:basilchimaobi2@gmail.com))
- Philip Omagbemi Esigbone ([@EsigboneO](https://x.com/@EsigboneO)) Contributed python code converted to Node