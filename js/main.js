
$ = (id) => { return document.getElementById(id); }

window.onload = async() => {
  await reload();
}

try {
  window.ethereum.on('accountsChanged', async(accounts) => {
    await walletChanged()
  });
  window.ethereum.on('networkChanged', async(networkId) => {
    await walletChanged()
  });
} catch (e) {
  console.log(e)
}

walletChanged = async () => {
  await reload();
};

reload = async () => {
  let connected = localStorage.getItem('connected');
  if (connected) {
    let { web3, account, networkId } = await getWeb3();
    localStorage.setItem('account', account);
    localStorage.setItem('network_id', networkId);
    const networkName = getEnv("network")
    if (networkName != "") {
      $('account-network').innerHTML = '<span style="color: ' + getEnv('color') + '">' + networkName + '</span>';
      $('account-address').innerHTML = account.slice(0,6) + '...' + account.slice(-4);
      enable();
    } else {
      $('account-network').innerHTML = '<span style="color: red">Unsupported Network</span>';
      $('account-address').innerHTML = '';
      disable();
    }
    $('wallet-connect').style.display = 'none';
    $('wallet-account').style.display = 'block';
  } else {
    $('wallet-connect').style.display = 'block';
    $('wallet-account').style.display = 'none';
    disable();
  }
  reset();
}

enable = () => {
  $('message').disabled = false;
  $('button-preview').disabled = false;
  $('button-mint').disabled = false;
  $('search-token-id').disabled = false;
  $('button-search').disabled = false;
}

disable = () => {
  $('message').disabled = true;
  $('button-preview').disabled = true;
  $('button-mint').disabled = true;
  $('search-token-id').disabled = true;
  $('button-search').disabled = true;
}

reset = () => {
  $('fork-from').style.display = 'none';
  $('search-token-id').value = '';
  $('search-result').style.display = 'none';
  $('not-found').style.display = 'none';
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
      const networkId = await web3.eth.net.getId(); // const networkType = await web3.eth.net.getNetworkType();
      const accounts = (await web3.eth.getAccounts()) || web3.eth.accounts;
      const account = accounts[0];
      return {web3, account, networkId}
    }
  } catch (err) {
    console.log(err);
  }
};

connectWallet = async() => {
  try {
    let { web3, account, networkId } = await getWeb3();
    localStorage.setItem('connected', true);
    await reload();
  } catch (err) {
    console.log(err);
  }
}

mintToken = async () => {
  try {
    let { web3, account, networkId } = await getWeb3();
    let message = $('message').value;
    let forkFromTokenId = $('fork-token-id').value
    const nftContractABI = getNFTContractABI()
    let nftContractAddress = getEnv('nft_address')
    const contract = new web3.eth.Contract(nftContractABI, nftContractAddress)
    const estimateGas = await contract.methods.mint(message, forkFromTokenId).estimateGas({from: account});
    contract.methods.mint(message, forkFromTokenId).send(
      {
        from: account,
        gas: estimateGas,
      }, (err, txHash) =>{
        if (err) {
          console.log(err);
          return
        }
        $('etherscan').innerHTML = '<a href="'+ getEnv("etherscan") + '/tx/' + txHash + '" target="_blank" style="font-size: large">Etherscan</a>';
      })
  } catch (err) {
    console.log(err);
  }
}

preview = () => {
  let message = $('message').value
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
  $('search-result').style.display = 'none'
  $('not-found').style.display = 'none'
  $('loading').style.display = 'block'
  try {
    let { web3, account } = await getWeb3();
    let tokenId = $('search-token-id').value;
    const nftContractABI = getNFTContractABI()
    const nftContractAddress = getEnv('nft_address')
    const contract = new web3.eth.Contract(nftContractABI, nftContractAddress)
    const tokenURI = await contract.methods.tokenURI(tokenId).call()
    let decodeString = decodeURIComponent(escape(window.atob(tokenURI.replace('data:application/json;base64,', ''))));
    let decodeJson = JSON.parse(decodeString)
    $('token-name').innerHTML = decodeJson.name
    $('token-image').src = decodeJson.image
    $('search-result').style.display = 'block'
  } catch (err) {
    console.log(err);
    $('not-found').style.display = 'block'
  }
  $('loading').style.display = 'none'
}

fork = async () => {
  let imageData = $('token-image').src
  let decodeString = decodeURIComponent(escape(window.atob(imageData.replace('data:image/svg+xml;base64,', ''))));
  let message = decodeString.replace('<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350"><rect width="100%" height="100%" fill="white" /><foreignObject x="0" y="0" width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">', '')
  message = message.replace('</div></foreignObject></svg>', '')
  $('message').value = message

  let tokenId = $('search-token-id').value;
  $('fork-from').innerHTML = "Fork from #" + tokenId
  $('fork-from').style.display = 'block'
  $('fork-token-id').value = tokenId
  $('message').focus()
}

const networkList = {
  "ethereum-mainnet": [
    {
      chainId: '0x1',
      chainName: "Ethereum Mainnet",
      nativeCurrency: {
        name: "ETH",
        symbol: "ETH",
        decimals: 18
      },
      rpcUrls: ['https://mainnet.infura.io/v3/aaaa'],
      blockExplorerUrls: ['https://etherscan.io']
    }
  ],
  "ethereum-rinkeby": [
    {
      chainId: '0x4',
      chainName: "Rinkeby Test Network",
      nativeCurrency: {
        name: "ETH",
        symbol: "ETH",
        decimals: 18
      },
      rpcUrls: ['https://rinkeby.infura.io/v3/'],
      blockExplorerUrls: ['https://rinkeby.etherscan.io']
    }
  ],
  "polygon-mainnet": [
    {
      chainId: '0x89',
      chainName: "Polygon Mainnet",
      nativeCurrency: {
        name: "MATIC",
        symbol: "MATIC",
        decimals: 18
      },
      rpcUrls: ['https://rpc-mainnet.maticvigil.com'],
      blockExplorerUrls: ['https://polygonscan.com']
    }
  ],
  "polygon-testnet": [
    {
      chainId: '0x13881',
      chainName: "Polygon Testnet",
      nativeCurrency: {
        name: "MATIC",
        symbol: "MATIC",
        decimals: 18
      },
      rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
      blockExplorerUrls: ['https://mumbai.polygonscan.com']
    }
  ],
  "bsc-mainnet": [
    {
      chainId: '0x38',
      chainName: "BSC Mainnet",
      nativeCurrency: {
        name: "BNB",
        symbol: "BNB",
        decimals: 18
      },
      rpcUrls: ['https://bsc-dataseed.binance.org'],
      blockExplorerUrls: ['https://bscscan.com']
    }
  ],
  "bsc-testnet": [
    {
      chainId: '0x61',
      chainName: "BSC Testnet",
      nativeCurrency: {
        name: "BNB",
        symbol: "BNB",
        decimals: 18
      },
      rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
      blockExplorerUrls: ['https://testnet.bscscan.com']
    }
  ]
}

changeCustomNetwork = (networkName) => {
  if (window.ethereum) {
    if (networkName == 'ethereum-mainnet') {
      window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }],
      })
    } else if (networkName == 'ethereum-rinkeby') {
      window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x4' }],
      })
    } else {
      window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: networkList[networkName]
      })
    }
    window.location = "./index.html"
  }
}

getNFTContractABI = () => {
  const nftContractABI = '[{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"baseURI","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"isOwner","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenOfOwnerByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"string","name":"message","type":"string"},{"internalType":"uint256","name":"forkFromTokenId","type":"uint256"}],"name":"mint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"string","name":"message","type":"string"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"forkFromTokenId","type":"uint256"}],"name":"generateTokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"pure","type":"function"}]'
  return JSON.parse(nftContractABI)
}

getEnv = (key) => {
  const networkId = localStorage.getItem("network_id")
  if (!["1", "4", "137", "80001", "56", "97"].includes(String(networkId))) {
    return ""
  }
  return env[key][String(networkId)]
}

const env = {
  "nft_address": {
    "1": "0x80F85B92825F4Ee243c03D7D9A07a6d6fF503751",
    "4": "0x8A52344596b0052b58D2cce14337e2Dbe8c3E1D2",
    "137": "0xD317cFfF093c08A43062B39075e51ac2060317F2",
    "80001": "0xcD8010db9b8D8B0D6261C1BAa02dDCc0CF9610E9",
    "56": "0xF510Bd92Cb7dECd7fAb409C4C59AF7D30f8d7052",
    "97": "0xBAA4e52f88382cbFcd3b88BeBFCC2e4003Feba58"
  },
  "etherscan": {
    "1": "https://etherscan.io",
    "4": "https://rinkeby.etherscan.io",
    "137": "https://polygonscan.com",
    "80001": "https://mumbai.polygonscan.com",
    "56": "https://bscscan.com",
    "97": "https://testnet.bscscan.com/"
  },
  "opensea": {
    "1": "https://opensea.io",
    "4": "https://testnets.opensea.io",
    "137": "https://opensea.io",
    "80001": "https://testnets.opensea.io",
    "56": "https://opensea.io",
    "97": "https://testnets.opensea.io"
  },
  "network": {
    "1": "Mainnet",
    "4": "Rinkeby",
    "137": "Polygon",
    "80001": "Ploygon Mumbai",
    "56": "BSC",
    "97": "BSC Testnet"
  },
  "color": {
    "1": "green",
    "4": "orange",
    "137": "DarkViolet",
    "80001": "DarkGoldenRod",
    "56": "GoldenRod",
    "97": "Olive"
  }
}
