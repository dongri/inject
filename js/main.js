try {
  window.ethereum.on('accountsChanged', (accounts) => {
    walletChanged()
  });
  window.ethereum.on('chainChanged', (chainId) => {
    walletChanged()
  });
  window.ethereum.on('networkChanged', (networkId) => {
    walletChanged()
  });
} catch (e) {
  console.log(e)
}

walletChanged = () => {
  getWeb3()
  detectAccount();
};

window.onload = function() {
  detectAccount();
}

detectAccount = async () => {
  let network = localStorage.getItem('network');
  let account = localStorage.getItem('account');
  if (network && account) {
    if (network === 'main') {
      document.getElementById('account-address').innerHTML = account.slice(0,6) + '...' + account.slice(-4);
      document.getElementById('account-network-main').innerHTML = 'Mainnet';
      document.getElementById('account-network-rinkeby').innerHTML = '';
      document.getElementById('account-network-error').innerHTML = '';
      enable();
    } else if (network === 'rinkeby') {
      document.getElementById('account-address').innerHTML = account.slice(0,6) + '...' + account.slice(-4);
      document.getElementById('account-network-main').innerHTML = '';
      document.getElementById('account-network-rinkeby').innerHTML = 'Rinkeby';
      document.getElementById('account-network-error').innerHTML = '';
      enable();
    } else {
      document.getElementById('account-address').innerHTML = '';
      document.getElementById('account-network-main').innerHTML = '';
      document.getElementById('account-network-rinkeby').innerHTML = '';
      document.getElementById('account-network-error').innerHTML = 'Network Error';
      disable();
      document.getElementById('wallet-connect').style.display = 'none';
      document.getElementById('wallet-account').style.display = 'block';
    }
  } else {
    disable();
  }
}

enable = () => {
  document.getElementById('wallet-connect').style.display = 'none';
  document.getElementById('wallet-account').style.display = 'block';
  document.getElementById('message').disabled = false;
  document.getElementById('button-preview').disabled = false;
  document.getElementById('button-mint').disabled = false;
}

disable = () => {
  document.getElementById('wallet-connect').style.display = 'block';
  document.getElementById('wallet-account').style.display = 'none';
  document.getElementById('message').disabled = true;
  document.getElementById('button-preview').disabled = true;
  document.getElementById('button-mint').disabled = true;

  document.getElementById('fork-from').style.display = 'none';
  document.getElementById('search-token-id').value = '';
  document.getElementById('search-result').style.display = 'none';
  document.getElementById('not-found').style.display = 'none';
}

getWeb3 = async () => {
  try {
    let currentProvider = null;
    if (window.ethereum) {
      await window.ethereum.enable();
      currentProvider = window.ethereum;
    } else if (window.web3) {
      currentProvider = window.web3.currentProvider;
    } else {
      alert('No Metamask (or other Web3 Provider) installed');
    }
    if (currentProvider) {
      const web3 = new Web3(currentProvider);
      const network = await web3.eth.net.getNetworkType();
      const accounts = (await web3.eth.getAccounts()) || web3.eth.accounts;
      const account = accounts[0];
      localStorage.setItem('network', network);
      localStorage.setItem('account', account);
      detectAccount();
      return {web3, network, account}
    }
  } catch (err) {
    console.log(err);
  }
};

connectWallet = async () => {
  try {
    let { web3, network, account } = await getWeb3();
  } catch (err) {
    console.log(err);
  }
}

mintToken = async () => {
  try {
    let { web3, network, account } = await getWeb3();

    let message = document.getElementById('message').value;
    let forkFromTokenId = document.getElementById('fork-token-id').value
    const nftContractABI = getNFTContractABI()
    let nftContractAddress = getEnv('nft_address')
    const contract = new web3.eth.Contract(nftContractABI, nftContractAddress)
    contract.methods.mint(message, forkFromTokenId).send(
      {
        from: account
      }, (err, txHash) =>{
        if (err) {
          console.log(err);
          return
        }
        document.getElementById('etherscan').innerHTML = '<a href="'+ getEnv("etherscan") + '/tx/' + txHash + '" target="_blank">Etherscan</a>';
      })
  } catch (err) {
    console.log(err);
  }
}

preview = () => {
  let message = document.getElementById('message').value
  var content = ''
  content += '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350">';
  content += '<rect width="100%" height="100%" fill="white" />';
  content += '<foreignObject x="0" y="0" width="100%" height="100%">';
  content += '<div xmlns="http://www.w3.org/1999/xhtml">';
  content += message;
  content += '</div>';
  content += '</foreignObject>';
  content += '</svg>';
  var blob = new Blob([ content ], { "type" : "image/svg+xml" });
  const a = document.createElement('a');
  document.body.appendChild(a);
  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = "preview.svg";
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 0);
}

searchToken = async () => {
  document.getElementById('search-result').style.display = 'none'
  document.getElementById('not-found').style.display = 'none'
  document.getElementById('loading').style.display = 'block'
  try {
    let { web3, network, account } = await getWeb3();
    let tokenId = document.getElementById('search-token-id').value;
    const nftContractABI = getNFTContractABI()
    const nftContractAddress = getEnv('nft_address')
    const contract = new web3.eth.Contract(nftContractABI, nftContractAddress)
    const tokenURI = await contract.methods.tokenURI(tokenId).call()
    let decodeString = decodeURIComponent(escape(window.atob(tokenURI.replace('data:application/json;base64,', ''))));
    let decodeJson = JSON.parse(decodeString)
    document.getElementById('token-name').innerHTML = decodeJson.name
    document.getElementById('token-image').src = decodeJson.image
    document.getElementById('search-result').style.display = 'block'
  } catch (err) {
    console.log(err);
    document.getElementById('not-found').style.display = 'block'
  }
  document.getElementById('loading').style.display = 'none'
}

fork = async () => {
  let imageData = document.getElementById('token-image').src
  let decodeString = decodeURIComponent(escape(window.atob(imageData.replace('data:image/svg+xml;base64,', ''))));
  let message = decodeString.replace('<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350"><rect width="100%" height="100%" fill="white" /><foreignObject x="0" y="0" width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">', '')
  message = message.replace('</div></foreignObject></svg>', '')
  document.getElementById('message').value = message

  let tokenId = document.getElementById('search-token-id').value;
  document.getElementById('fork-from').innerHTML = "Fork from #" + tokenId
  document.getElementById('fork-from').style.display = 'block'
  document.getElementById('fork-token-id').value = tokenId
  document.getElementById('message').focus()
}

getEnv = (key) => {
  const network = localStorage.getItem("network")
  if (network === "main" || network === "rinkeby") {
    return env[key][network]
  } else {
    return "Network Error"
  }
}

getNFTContractABI = () => {
  const nftContractABI = '[{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"baseURI","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"isOwner","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenOfOwnerByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"string","name":"message","type":"string"},{"internalType":"uint256","name":"forkFromTokenId","type":"uint256"}],"name":"mint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"string","name":"message","type":"string"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"forkFromTokenId","type":"uint256"}],"name":"generateTokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"pure","type":"function"}]'
  return JSON.parse(nftContractABI)
}

const env = {
  "nft_address": {
    "main": "0x80F85B92825F4Ee243c03D7D9A07a6d6fF503751",
    "rinkeby": "0x8A52344596b0052b58D2cce14337e2Dbe8c3E1D2"
  },
  "etherscan": {
    "main": "https://etherscan.io",
    "rinkeby": "https://rinkeby.etherscan.io"
  },
  "opensea": {
    "main": "https://opensea.io",
    "rinkeby": "https://testnets.opensea.io"
  }
}
