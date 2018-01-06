import StellarSdk from 'stellar-sdk';

/**
 * Generate new Stellar keypair
 */
export function genKeypair() {
  return StellarSdk.Keypair.random();
}

/**
 * Return keypair from privateKey
 * @param {string} privateKey
 */
export function getKeypairFromPrivateKey(privateKey) {
  return StellarSdk.Keypair.fromSecret(privateKey);
}

/**
 * Instantiate server object for either testnet or mainnet
 * @param {boolean} testnet Connect to testnet
 * @return {StellarSdk.Server}
 */
export function connect(testnet = false) {
  return new StellarSdk.Server(testnet === true ? 'https://horizon-testnet.stellar.org' : 'https://horizon.stellar.org');
}

/**
 * Select network to use
 * @param {boolean} testnet Use testnet
 */
export function selectNetwork(testnet = false) {
  if (!testnet || testnet === true) {
    StellarSdk.Network.useTestNetwork();
  } else {
    StellarSdk.Network.usePublicNetwork();
  }
}

/**
 * Check balance of address
 * @param {string} address address to check
 * @param {boolean} testnet
 */
export function getBalance(address, testnet = false) {
  return new Promise((resolve, reject) => {
    const server = connect(testnet);
    server.loadAccount(address)
      .then(res => resolve(res.balances))
      .catch(err => reject(err.message.detail));
  });
}

/**
 * Send a transaction to an address
 * @param {string} privateKey Private key of wallet to send from
 * @param {string} destination Receiver of funds
 * @param {string} amount Amount to send
 * @param {boolean} testnet
 */
export function sendTransaction(privateKey, destination, amount, testnet = false) {
  if (!privateKey || !destination || !amount) {
    throw new Error('An address, amount, and private key must be specified');
  }
  return new Promise((resolve, reject) => {
    selectNetwork(testnet);
    const server = connect(testnet);
    const keypair = getKeypairFromPrivateKey(privateKey);
    server.loadAccount(keypair.publicKey())
      .then((account) => {
        const transaction = createTransaction(account, destination, amount, keypair);
        server.submitTransaction(transaction)
          .then((res) => resolve({ hash: res.hash, ledger: res.ledger }))
          .catch((err) => reject(err.data.extras.result_codes));
      });
  });
}

/**
 * Construct Transaction
 * @param {object} account Account to send from
 * @param {object} destination Destination to send funds to
 * @param {object} amount Amount of funds to send
 * @param {object} keypair Keypair object of sender
 */
export function createTransaction(account, destination, amount, keypair) {
  const transaction = buildTransaction(account, destination, amount);
  // Sign transaction
  transaction.sign(keypair);
  return transaction;
}

/**
 * Build transaction object
 * @param {string} account Account to send from
 * @param {string} destination Destination to send funds to
 * @param {string} amount Amount of funds to send
 */
export function buildTransaction(account, destination, amount) {
  return new StellarSdk.TransactionBuilder(account)
    .addOperation(StellarSdk.Operation.payment({
      asset: StellarSdk.Asset.native(),
      destination,
      amount,
    }))
    .build();
}
