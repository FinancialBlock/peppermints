import { useEffect, useState } from "react";
import styled from "styled-components";
import confetti from "canvas-confetti";
import * as anchor from "@project-serum/anchor";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { GatewayProvider } from '@civic/solana-gateway-react';
import Countdown from "react-countdown";
import { Snackbar, Paper, LinearProgress, Chip } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import { toDate, AlertState, getAtaForMint } from './utils';
import { MintButton } from './MintButton';
import "./responsive.css";
import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  CANDY_MACHINE_PROGRAM,
} from "./candy-machine";

const cluster = process.env.REACT_APP_SOLANA_NETWORK!.toString();
const decimals = process.env.REACT_APP_SPL_TOKEN_TO_MINT_DECIMALS ? +process.env.REACT_APP_SPL_TOKEN_TO_MINT_DECIMALS!.toString() : 9;
const splTokenName = process.env.REACT_APP_SPL_TOKEN_TO_MINT_NAME ? process.env.REACT_APP_SPL_TOKEN_TO_MINT_NAME.toString() : "TOKEN";

const WalletContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
`;

const MainTitle = styled.h1`
  font-size: 66px;
  font-family: 'Raleway';
  font-style: italic;
  font-weight: 900;
  margin: 0 0 15px 0;
`;

const MainTitles = styled.h1`
  font-size: 30px;
  font-family: 'Raleway';
  font-style: italic;
  font-weight: 900;
  margin: 0 0 15px 0;
`;

const TotalMinted = styled.p`
  margin-top: 25px;
  font-size: 14px;
  color: #E0E0E0;
  font-family: 'Montserrat', sans-serif;
  font-weight: 400;
`;

const WhitelistNotification = styled.p`
  margin: 15px 0 0 0;
  font-size: 14px;
  color: #E0E0E0;
  font-family: 'Montserrat', sans-serif;
  font-weight: 400;
`;

const ShimmerTitle = styled.h1`
  margin: 20px auto;
  text-transform: uppercase;
  animation: glow 2s ease-in-out infinite alternate;
  color: var(--main-text-color);
  @keyframes glow {
    from {
      text-shadow: 0 0 20px var(--main-text-color);
    }
    to {
      text-shadow: 0 0 30px var(--title-text-color), 0 0 10px var(--title-text-color);
    }
  }
`;

const IconContainer = styled.div`
  display: block;
  margin-top: auto;
  margin-bottom: auto;
`;

const InfoIcon = styled.img`
  height: 22px;
  margin: 0 8px;
  vertical-align: top;
`;

const InfoContainer = styled.div`
  display: inline-flex;
`;

const IconLink = styled.a`
  text-decoration: none;
`;

const TotalItems = styled.p`
  font-size: 20px;
  font-family: 'Poppins';
  font-weight: 400;
  margin: 0 10px 0 0;
  color: white;
  border: 2px solid #fff;
  border-radius: 5px;
  border-color: white;
  background: #4E44CE;
  padding: 3px 20px;
  text-transform: uppercase;
  line-height: 28px;
`;

const Price = styled.p`
  font-weight: 400;
  font-size: 20px;
  font-family: 'Poppins' !important;
  margin: 0 10px 0 0;
  background: #4E44CE;
  border: 2px solid #fff;
  border-radius: 5px;
  padding: 3px 20px;
  text-transform: uppercase;
  line-height: 28px;
`;

const ProjectDescription = styled.p`
  font-size: 18px;
  font-weight: 400;
  line-height: 40px;
  font-family: 'Montserrat', sans-serif;
  color: #E0E0E0;
`;

const WalletAmount = styled.div`
  color: black;
  width: auto;
  padding: 5px 5px 5px 16px;
  min-width: 48px;
  min-height: auto;
  border-radius: 22px;
  background-color: var(--main-text-color);
  box-shadow: 0px 3px 5px -1px rgb(0 0 0 / 20%), 0px 6px 10px 0px rgb(0 0 0 / 14%), 0px 1px 18px 0px rgb(0 0 0 / 12%);
  box-sizing: border-box;
  transition: background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, border 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  font-weight: 500;
  line-height: 1.75;
  text-transform: uppercase;
  border: 0;
  margin: 0;
  display: inline-flex;
  outline: 0;
  position: relative;
  align-items: center;
  user-select: none;
  vertical-align: middle;
  justify-content: flex-start;
  gap: 10px;
`;

const Wallet = styled.ul`
  flex: 0 0 auto;
  margin: 0;
  padding: 0;
`;

const GoldTitle = styled.h2`
  color: var(--title-text-color);
  align-content: center;
`;

const DesContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 20px;
`;

const ConnectButton = styled(WalletMultiButton)`
  border-radius: 7px !important;
  padding: 30px;
  background-color: #4E44CE;
  margin: 0 auto;
  width: 100%;
  font-family: Montserrat, sans-serif !important;
  font-size: 18px !important;
  font-weight: 500 !important;
  text-transform: uppercase !important;
  text-align: center !important;
`;


const Card = styled(Paper)`
  display: inline-block;
  background-color: var(card-background-lighter-color) !important;
  margin: 5px;
  min-width: 40px;
  padding: 24px;
  h1{
    margin:0px;
  }
`;

const MintButtonContainer = styled.div`
  button.MuiButton-contained:not(.MuiButton-containedPrimary).Mui-disabled {
    color: #fff;
  }
  .MuiButton-contained {
    background-color: #4E44CE !important;
    color: #fff !important;
    font-family: 'Montserrat', sans-serif !important;
    font-size: 18px !important;
    font-weight: 500 !important;
    text-transform: uppercase !important;
    text-align: center !important;
  }
  .MuiButton-label {
    align-items: center !important;
    justify-content: center !important;
  }
  .MuiButton-root {
    padding: 18px !important;
  }
`;

const Logo = styled.div`
  flex: 0 0 auto;
  img {
    height: 60px;
  }
`;

const MainContainers = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 20px;
  margin-bottom: 20px;
  margin-right: 4%;
  margin-left: 4%;
  text-align: center;
  justify-content: center;
`;

const NFT = styled(Paper)`
  min-width: 500px;
  padding: 5px 20px 20px 20px;
  flex: 1 1 auto;
  background-color: var(--card-background-color) !important;
  box-shadow: 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22) !important;
`;

const Des = styled(NFT)`
  text-align: left;
  padding-top: 0px;
`;

const Menu = styled.ul`
  list-style: none;
  display: inline-flex;
  flex: 1 0 auto;
  li {
    margin: 0 12px;
    a {
      color: var(--main-text-color);
      list-style-image: none;
      list-style-position: outside;
      list-style-type: none;
      outline: none;
      text-decoration: none;
      text-size-adjust: 100%;
      touch-action: manipulation;
      transition: color 0.3s;
      padding-bottom: 15px;
      img {
        max-height: 26px;
      }
    }
    a:hover, a:active {
      color: rgb(131, 146, 161);
      border-bottom: 4px solid var(--title-text-color);
    }
  }
`;

const SolExplorerLink = styled.a`
  color: var(--title-text-color);
  border-bottom: 1px solid var(--title-text-color);
  font-weight: bold;
  list-style-image: none;
  list-style-position: outside;
  list-style-type: none;
  outline: none;
  text-decoration: none;
  text-size-adjust: 100%;
  :hover {
    border-bottom: 2px solid var(--title-text-color);
  }
`;

const MainContainer = styled.div`
  display: flex;
  flex-direction: row;
  max-width: 1200px;
  margin-right: auto;
  margin-left: auto;
  min-height: 100vh;
  align-items: center;
`;


const LeftContainer = styled.div`
  width: 50%;
  max-width: 50%;
  text-align: left;
  margin: 10px
`;

const RightContainer = styled.div`
  width: 50%;
  max-width: 50%;
  text-align: left;
  margin: 10px;
`;

const Image = styled.img`
  height: 500px;
  width: auto;
  border-radius: 10px;
  box-shadow: 5px 5px 40px 5px rgba(0,0,0,0.5);
`;

const BorderLinearProgress = styled(LinearProgress)`
  height: 10px !important;
  border-radius: 30px;
  border: 2px solid #6523c9;
  box-shadow: 5px 5px 40px 5px rgba(0, 0, 0, 0.5);
  background-color: #e5e2e2 !important;

  > div.MuiLinearProgress-barColorPrimary {
    background-color: #4E44CE !important;
  }

  > div.MuiLinearProgress-bar1Determinate {
    border-radius: 30px !important;
    background-color: #4E44CE;
  }
`;

const LogoAligner = styled.div`
  display: flex;
  align-items: center;
  img {
    max-height: 35px;
    margin-right: 10px;
  }
`;


export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  txTimeout: number;
  rpcHost: string;
}

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT
  const [isActive, setIsActive] = useState(false); // true when countdown completes or whitelisted
  const [solanaExplorerLink, setSolanaExplorerLink] = useState<string>("");
  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  const [itemsRemaining, setItemsRemaining] = useState(0);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [payWithSplToken, setPayWithSplToken] = useState(false);
  const [price, setPrice] = useState(0);
  const [priceLabel, setPriceLabel] = useState<string>("SOL");
  const [whitelistPrice, setWhitelistPrice] = useState(0);
  const [whitelistEnabled, setWhitelistEnabled] = useState(false);
  const [isBurnToken, setIsBurnToken] = useState(false);
  const [whitelistTokenBalance, setWhitelistTokenBalance] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  const [endDate, setEndDate] = useState<Date>();
  const [isPresale, setIsPresale] = useState(false);
  const [isWLOnly, setIsWLOnly] = useState(false);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const rpcUrl = props.rpcHost;

  const refreshCandyMachineState = () => {
    (async () => {
      if (!wallet) return;

      const cndy = await getCandyMachineState(
        wallet as anchor.Wallet,
        props.candyMachineId,
        props.connection
      );

      setCandyMachine(cndy);
      setItemsAvailable(cndy.state.itemsAvailable);
      setItemsRemaining(cndy.state.itemsRemaining);
      setItemsRedeemed(cndy.state.itemsRedeemed);

      var divider = 1;
      if (decimals) {
        divider = +('1' + new Array(decimals).join('0').slice() + '0');
      }

      // detect if using spl-token to mint
      if (cndy.state.tokenMint) {
        setPayWithSplToken(true);
        // Customize your SPL-TOKEN Label HERE
        // TODO: get spl-token metadata name
        setPriceLabel(splTokenName);
        setPrice(cndy.state.price.toNumber() / divider);
        setWhitelistPrice(cndy.state.price.toNumber() / divider);
      } else {
        setPrice(cndy.state.price.toNumber() / LAMPORTS_PER_SOL);
        setWhitelistPrice(cndy.state.price.toNumber() / LAMPORTS_PER_SOL);
      }


      // fetch whitelist token balance
      if (cndy.state.whitelistMintSettings) {
        setWhitelistEnabled(true);
        setIsBurnToken(cndy.state.whitelistMintSettings.mode.burnEveryTime);
        setIsPresale(cndy.state.whitelistMintSettings.presale);
        setIsWLOnly(!isPresale && cndy.state.whitelistMintSettings.discountPrice === null);

        if (cndy.state.whitelistMintSettings.discountPrice !== null && cndy.state.whitelistMintSettings.discountPrice !== cndy.state.price) {
          if (cndy.state.tokenMint) {
            setWhitelistPrice(cndy.state.whitelistMintSettings.discountPrice ?.toNumber() / divider);
          } else {
            setWhitelistPrice(cndy.state.whitelistMintSettings.discountPrice ?.toNumber() / LAMPORTS_PER_SOL);
          }
        }

        let balance = 0;
        try {
          const tokenBalance =
            await props.connection.getTokenAccountBalance(
              (
                await getAtaForMint(
                  cndy.state.whitelistMintSettings.mint,
                  wallet.publicKey,
                )
              )[0],
            );

          balance = tokenBalance ?.value ?.uiAmount || 0;
        } catch (e) {
          console.error(e);
          balance = 0;
        }
        setWhitelistTokenBalance(balance);
        setIsActive(isPresale && !isEnded && balance > 0);
      } else {
        setWhitelistEnabled(false);
      }

      // end the mint when date is reached
      if (cndy ?.state.endSettings ?.endSettingType.date) {
        setEndDate(toDate(cndy.state.endSettings.number));
        if (
          cndy.state.endSettings.number.toNumber() <
          new Date().getTime() / 1000
        ) {
          setIsEnded(true);
          setIsActive(false);
        }
      }
      // end the mint when amount is reached
      if (cndy ?.state.endSettings ?.endSettingType.amount) {
        let limit = Math.min(
          cndy.state.endSettings.number.toNumber(),
          cndy.state.itemsAvailable,
        );
        setItemsAvailable(limit);
        if (cndy.state.itemsRedeemed < limit) {
          setItemsRemaining(limit - cndy.state.itemsRedeemed);
        } else {
          setItemsRemaining(0);
          cndy.state.isSoldOut = true;
          setIsEnded(true);
        }
      } else {
        setItemsRemaining(cndy.state.itemsRemaining);
      }

      if (cndy.state.isSoldOut) {
        setIsActive(false);
      }
    })();
  };

  const renderGoLiveDateCounter = ({ days, hours, minutes, seconds }: any) => {
    return (
      <div><Card elevation={1}><h1>{days}</h1>Days</Card><Card elevation={1}><h1>{hours}</h1>
        Hours</Card><Card elevation={1}><h1>{minutes}</h1>Mins</Card><Card elevation={1}>
        <h1>{seconds}</h1>Secs</Card></div>
    );
  };

  const renderEndDateCounter = ({ days, hours, minutes }: any) => {
    let label = "";
    if (days > 0) {
      label += days + " days "
    }
    if (hours > 0) {
      label += hours + " hours "
    }
    label += (minutes + 1) + " minutes left to MINT."
    return (
      <div><h3>{label}</h3></div>
    );
  };

  function displaySuccess(mintPublicKey: any): void {
    let remaining = itemsRemaining - 1;
    setItemsRemaining(remaining);
    setIsSoldOut(remaining === 0);
    if (isBurnToken && whitelistTokenBalance && whitelistTokenBalance > 0) {
      let balance = whitelistTokenBalance - 1;
      setWhitelistTokenBalance(balance);
      setIsActive(isPresale && !isEnded && balance > 0);
    }
    setItemsRedeemed(itemsRedeemed + 1);
    const solFeesEstimation = 0.012; // approx
    if (!payWithSplToken && balance && balance > 0) {
      setBalance(balance - (whitelistEnabled ? whitelistPrice : price) - solFeesEstimation);
    }
    setSolanaExplorerLink(cluster === "devnet" || cluster === "testnet"
      ? ("https://solscan.io/token/" + mintPublicKey + "?cluster=" + cluster)
      : ("https://solscan.io/token/" + mintPublicKey));
    throwConfetti();
  };

  function throwConfetti(): void {
    confetti({
      particleCount: 400,
      spread: 70,
      origin: { y: 0.6 },
    });
  }

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet && candyMachine ?.program && wallet.publicKey) {
        const mint = anchor.web3.Keypair.generate();
        const mintTxId = (
          await mintOneToken(candyMachine, wallet.publicKey, mint)
        )[0];

        let status: any = { err: true };
        if (mintTxId) {
          status = await awaitTransactionSignatureConfirmation(
            mintTxId,
            props.txTimeout,
            props.connection,
            'singleGossip',
            true,
          );
        }

        if (!status ?.err) {
          setAlertState({
            open: true,
            message: 'Congratulations! Mint succeeded!',
            severity: 'success',
          });

          // update front-end amounts
          displaySuccess(mint.publicKey);
        } else {
          setAlertState({
            open: true,
            message: 'Mint failed! Please try again!',
            severity: 'error',
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || 'Minting failed! Please try again!';
      if (!error.msg) {
        if (!error.message) {
          message = 'Transaction Timeout! Please try again.';
        } else if (error.message.indexOf('0x138')) {
        } else if (error.message.indexOf('0x137')) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf('0x135')) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      setIsMinting(false);
    }
  };


  useEffect(() => {
    (async () => {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(refreshCandyMachineState, [
    wallet,
    props.candyMachineId,
    props.connection,
    isEnded,
    isPresale
  ]);

  return (
    <main>

      <Menu style={{alignItems: "center"}}>
        <Logo><a href="http://localhost:3000/" target="_blank" rel="noopener noreferrer"><img alt=""
                                                                                              src="logo.png"/></a></Logo>
        <li><a href="https://www.billionairesolbears.com" target="_blank" rel="noopener noreferrer">Mint a SolBear</a>
        </li>
        <li><a href="http://mintasolbears/" target="_blank"
               rel="noopener noreferrer">How to Purchase SolBear?</a></li>
        <li><a href="http://localhost:3000/" target="_blank"
               rel="noopener noreferrer">What is a NFT?</a></li>
      </Menu>
      <DesContainer className="maincontainer">
        <LeftContainer className="leftcontainer">
          <Image className="nft-image" src="SolBear.gif" alt="Mint a YOURNFT"/>
        </LeftContainer>
        <RightContainer className="rightcontainer" style={{color: "blue", alignItems: "center", alignContent: "center", textAlign: "center"}}>
          <ShimmerTitle className="maintitle">Billionaire SolBears</ShimmerTitle>

          <ShimmerTitle className="maintitle">NFT Collection</ShimmerTitle>
          <InfoContainer>
            <TotalItems className="totalitems">Total Items {itemsAvailable}</TotalItems>
            <Price className="price">Price ◎ {isActive && whitelistEnabled && (whitelistTokenBalance > 0) ? (whitelistPrice + " ") : (price + " ")} </Price>
            <IconContainer>
              <IconLink className="infoIcon" href="https://www.billionairesolbears.com/" target="__blank"> <InfoIcon src="website.svg" /> </IconLink>
              <IconLink className="infoIcon" href="https://discord.gg/MrCtgHQ2" target="__blank"> <InfoIcon src="discord.svg" /> </IconLink>
              <IconLink className="infoIcon" href="https://www.twitter.com/" target="__blank"> <InfoIcon src="twitter.svg" /> </IconLink>
            </IconContainer>
          </InfoContainer>
          <ProjectDescription> The Billionaire SolBears collection is a collection of unique NFT Solana Bears built on the Solana Blockchain! Our team is looking to build faster and more cost efficient way to process NFT's on the blockchain. Join us and mint your own Billionaire SolBear! </ProjectDescription>
          <MintButtonContainer>
            {!isActive && !isEnded && candyMachine ?.state.goLiveDate && (!isWLOnly || whitelistTokenBalance > 0) ? (
              <Countdown
                date={toDate(candyMachine ?.state.goLiveDate)}
                onMount={({ completed }) => completed && setIsActive(!isEnded)}
                onComplete={() => {
                  setIsActive(!isEnded);
                }}
                renderer={renderGoLiveDateCounter}
              />) : (
              !wallet ? (
                <ConnectButton>Connect Wallet</ConnectButton>
              ) : (!isWLOnly || whitelistTokenBalance > 0) ?
                candyMachine ?.state.gatekeeper &&
                wallet.publicKey &&
                wallet.signTransaction ? (
                  <GatewayProvider
                    wallet={{
                      publicKey:
                        wallet.publicKey ||
                        new PublicKey(CANDY_MACHINE_PROGRAM),
                      //@ts-ignore
                      signTransaction: wallet.signTransaction,
                    }}
                    // // Replace with following when added
                    // gatekeeperNetwork={candyMachine.state.gatekeeper_network}
                    gatekeeperNetwork={
                      candyMachine ?.state ?.gatekeeper ?.gatekeeperNetwork
                    } // This is the ignite (captcha) network
                    /// Don't need this for mainnet
                    clusterUrl={rpcUrl}
                    options={{ autoShowModal: false }}
                  >
                    <MintButton
                      candyMachine={candyMachine}
                      isMinting={isMinting}
                      isActive={isActive}
                      isEnded={isEnded}
                      isSoldOut={isSoldOut}
                      onMint={onMint}
                    />
                  </GatewayProvider>
                ) : (
                  <MintButton
                    candyMachine={candyMachine}
                    isMinting={isMinting}
                    isActive={isActive}
                    isEnded={isEnded}
                    isSoldOut={isSoldOut}
                    onMint={onMint}
                  />
                ) :
                <h1>Mint is private.</h1>
            )}
          </MintButtonContainer>
          {wallet && isActive && whitelistEnabled && (whitelistTokenBalance > 0) && isBurnToken &&
            <WhitelistNotification>You own <b>{whitelistTokenBalance}</b> WL mint {whitelistTokenBalance > 1 ? "tokens" : "token"}.</WhitelistNotification>}
          {wallet && isActive && whitelistEnabled && (whitelistTokenBalance > 0) && !isBurnToken &&
            <WhitelistNotification>You are whitelisted and allowed to mint.</WhitelistNotification>}
          {wallet && isActive &&
            <TotalMinted>TOTAL MINTED : {itemsRedeemed} / {itemsAvailable}</TotalMinted>}
          {wallet && isActive && <BorderLinearProgress variant="determinate"
                                                       value={100 - (itemsRemaining * 100 / itemsAvailable)} />}
          <br />
          {wallet && isActive && solanaExplorerLink &&
            <SolExplorerLink href={solanaExplorerLink} target="_blank">View on Solscan</SolExplorerLink>}
        </RightContainer>
      </DesContainer>
      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
  <DesContainer>
    <Des elevation={2}>
      <GoldTitle style={{textAlign:"center"}}>Welcome to Mint A SolBear!</GoldTitle>
      <p style={{textAlign: "center"}}>The Billionaire SolBear Collection is 11,501 unique collectable SolBears with proof of ownership on the Solana blockchain.
        Your Billionaire SolBear is more then just an NFT it is a membership card, and grants access to members-only benefits. When you own an SolBear NFT and HODL grants you a
        Lifetime membership to the Private Club. Our team looks to use blockchain technology to enhance the community. Collect some cool digital art and join us on our journey ! The fastest Bear is a SolBear don’t forget it ! </p>
      </Des>
    <Des elevation={2}>
      <GoldTitle style={{textAlign: "center"}}>How to Mint a Billionaire SolBear?</GoldTitle>
      <p> 1.) Download and install a Chrome browser plugin called <a style={{color: "#93ccea"}} href="https://phantom.app/">Phantom</a>, <a style={{color: "#93ccea"}} href="https://solflare.com/">Solflare</a> and <a style={{color: "#93ccea"}} href="https://slope.finance/">Slope Finance</a>. This will allow websites (that you authorize) access to your Solana account.</p>
      <p> 2.) If you made a new account, buy some Solana. The Solana plugin has a button that will
        allow you to buy Solana from an exchange.</p>
      <p>3.) Once you have the plugin installed, this website will recognize it and add buttons that allow you to bid on,
        buy and sell Bears directly in the interface.</p>
      <p>4.) For example, you can buy Billionaire Bears for 20.95 SOL .</p>
    </Des>
    <Des elevation={2}>
      <GoldTitle style={{textAlign: "center"}}>What is an NFT?</GoldTitle>
      <p>Non-fungible tokens (NFTs) are cryptographic assets on a blockchain with unique identification codes and
        metadata that distinguish them from each other. Unlike cryptocurrencies, they cannot be traded or exchanged at equivalency. This differs from fungible tokens like cryptocurrencies,
        which are identical to each other and, therefore, can serve as a medium for commercial transactions.</p>
      <ul>
        <li>NFTs are unique cryptographic tokens that exist on a blockchain and cannot be replicated.</li>
        <li>NFTs can represent real-world items like artwork and real estate.</li>
        <li> "Tokenizing" these real-world tangible assets makes buying, selling, and trading them more efficient while reducing the probability of fraud.</li>
        <li>NFTs can also function to represent individuals' identities, property rights, and more.</li>
      </ul>
      <p>
        Much of the current market for NFTs is centered around collectibles, such as digital artwork, sports cards, music,
        3D objects, lands and rarities. Perhaps the most hyped space is NFT Collectable communities, a place to collect
        non-fungible tokenized that offer authorized.</p>
      <p>
        A great comparison to understand how a Solbears NFT works is comparing it to the classic Ty Bears. Everyones
        favorite uniques beanie collections. I am pretty sure everyone has seen their parents or even grandparents
        holding on to a collectible Ty Bear. One of the unique things about Ty Bears and what makes some so valuable
        is due to their rarity and uniqueness. Design quirks made certain beanie babies more valuable. For example,
        Patti the Platypus came in several colors, which made buyers and collectors want to purchase the complete sets
        of collections. Tie-dyed beanie babies, such as Peace the Bear, were also popular. This is the same thing SolBears
        except SolBears is also a membership you can hold compatible with any Solana wallet and fully owned and tradable.
       {/* <img style={{alignContent: "revert", alignItems:"stretch"}} src="SolBear.gif" alt="Italian Trulli"/>*/}


      </p>
    </Des>
      </DesContainer>
    </main>

  );
};

export default Home;
