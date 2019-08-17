# Recur.eth

Recurring purchase of tokens on Ethereum in a permissionless manner. 

## Installation

1. Ensure that you have Truffle installed globally.
    ```javascript
    npm install -g truffle
    ```

2. Run the development console.
    ```javascript
    truffle develop
    ```

3. Compile and migrate the smart contracts. Note inside the development console we don't preface commands with `truffle`.
    ```javascript
    compile
    migrate
    ```

4. In the `client` directory, we run the React app. Smart contract changes must be manually recompiled and migrated.
    ```javascript
    // in another terminal (i.e. not in the truffle develop prompt)
    cd client
    npm run start
    ```

5. Truffle can run tests written in Solidity or JavaScript against your smart contracts. Note the command varies slightly if you're in or outside of the development console.
    ```javascript
    // inside the development console.
    test

    // outside the development console..
    truffle test
    ```

6. Jest is included for testing React components. Compile your contracts before running Jest, or you may receive some file not found errors.
    ```javascript
    // ensure you are inside the client directory when running this
    npm run test
    ```

7. To build the application for production, use the build script. A production build will be in the `client/build` folder.
    ```javascript
    // ensure you are inside the client directory when running this
    npm run build
    ```

## FAQ

* __How do I use this with the Ganache-CLI?__

    Run ganache-cli in a terminal tab. In another terminal tab, run truffle migrate --network develop and continue from step 5.

* __Where is my production build?__

    The production build will be in the `client/build` folder after running `npm run build` in the `client` folder.
