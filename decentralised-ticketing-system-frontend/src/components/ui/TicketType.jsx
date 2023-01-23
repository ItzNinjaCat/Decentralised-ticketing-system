import React, { useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Image from 'react-bootstrap/Image';
import { TICKET_ADDRESS, TICKET_ABI, TIK_ADDRESS, TIK_ABI } from '../../constants/contracts';
import { getContract } from '../../utils/contractUtils';
import { useWeb3React } from '@web3-react/core';
import { connectorHooks, getName } from '../../utils/connectors';
import { useState } from 'react';
import { onAttemptToApprove } from '../../utils/contractUtils';
import { ethers } from 'ethers';
import useBalances from '../../hooks/useBalance';
import { formatEther, parseEther } from 'ethers/lib/utils';
const TicketType = (({
    eventId,
    ticketTypeId,
    name,
    price,
    maxSupply,
    currentSupply,
    tokenURI,
    souvenirTokenURI,
}) => {
    const { connector } = useWeb3React();
    const hooks = connectorHooks[getName(connector)];
    const { useProvider, useAccount, useAccounts } = hooks;
    const provider = useProvider();
    const account = useAccount();
    const accounts = useAccounts();
    const contract = getContract(TICKET_ADDRESS, TICKET_ABI.abi, provider, account);
    const tokenContract = getContract(TIK_ADDRESS, TIK_ABI.abi, provider, account);
    const balances = useBalances(provider, accounts, tokenContract);
    const [recipeintAddress, setRecipeintAddress] = useState('');
    const [ticketAmountPersonal, setTicketAmountPersonal] = useState(1);
    const [ticketAmountGift, setTicketAmountGift] = useState(1);
    const [showPersonal, setShowPersonal] = useState(false);
    const [showGift, setShowGift] = useState(false);
    const [validatedPersonal, setValidatedPersonal] = useState(false);
    const [validatedGift, setValidatedGift] = useState(false);
    const handleShowPersonal = () => setShowPersonal(true);
    const handleClosePersonal = () => setShowPersonal(false);
    const handleShowGift = () => setShowGift(true);
    const handleCloseGift = () => setShowGift(false);
    const buyTickets = (async (recipient, amount) => {
        const signature = await onAttemptToApprove(contract, tokenContract, account, String(price * amount), new Date() + 60 * 60);
        const tx = await contract.ticketPurchasePermit(
            parseEther(String(price * amount)),
            signature.deadline,
            signature.v,
            signature.r,
            signature.s,
        )
        tx.wait().then(() => {
            const ticketSale = Array(Number(amount)).fill(0).map(async () => {
                return await contract.buyTicket(
                    eventId,
                    ticketTypeId,
                    recipient
                )
            });
            Promise.all(ticketSale).then(() => {
                console.log('done');
            });
        });
    });

    const changeTicketAmountPersonal = ((event) => {
        setTicketAmountPersonal(event.target.value);
    });

    const changeTicketAmountGift = ((event) => {
        setTicketAmountGift(event.target.value);
    });

    const changeRecipientAddress = ((event) => {
        setRecipeintAddress(event.target.value);
    });

    const handleSubmitGift = ((event) => {
        const form = event.currentTarget;
        if (
            form.checkValidity() === false ||
            !ethers.utils.isAddress(recipeintAddress) ||
            ticketAmountGift <= 0 || ticketAmountGift > currentSupply
        ) {
            console.log('invalid');
            event.preventDefault();
            event.stopPropagation();
            setValidatedGift(true);
        }
        else {
            setValidatedGift(true);
            event.preventDefault();
            event.stopPropagation();
            console.log('valid');
            buyTickets(recipeintAddress, ticketAmountGift);
            setValidatedGift(false);
        }

        setTicketAmountGift(1);
        setRecipeintAddress('');
    });

        const handleSubmitPersonal = (async (event) => {
        const form = event.currentTarget;
        if (
            form.checkValidity() === false ||
            ticketAmountGift <= 0 || ticketAmountGift > currentSupply
        ) {
            console.log('invalid');
            event.preventDefault();
            event.stopPropagation();
            setValidatedPersonal(true);
        }
        else {
            setValidatedPersonal(true);
            event.preventDefault();
            event.stopPropagation();
            console.log('valid');
            buyTickets(account, ticketAmountPersonal);
            setValidatedPersonal(false);
        }

        setTicketAmountPersonal(1);
    });     
    const [ticketImage, setTicketImage] = useState(undefined);
    const [souvenirImage, setSouvenirImage] = useState(undefined);
    useEffect(() => {
        fetch((tokenURI)).then(res => {
            res.json().then(metadata => {
                setTicketImage(metadata.image);
            });
        });
        fetch((souvenirTokenURI)).then(res => {
            res.json().then(metadata => {
                setSouvenirImage(metadata.image);
            });
        });
    }, [ticketImage, souvenirImage, tokenURI, souvenirTokenURI]);
    return (

        <div className='d-flex flex-column align-items-center'>
            <Modal
                show={showGift}
                onHide={handleCloseGift}
                centered
            >
                <Modal.Header closeButton>
                <Modal.Title>Purchase tickets</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form
                        noValidate
                        validated={validatedGift}
                        onSubmit={handleSubmitGift}
                    >
                        <Form.Group  controlId="address">
                            <Form.Label>Recipient address</Form.Label>
                            <InputGroup hasValidation>
                            <Form.Control 
                                type="text"
                                placeholder="Enter recipient address"
                                onChange={changeRecipientAddress}
                                value={recipeintAddress}
                                minLength='42'
                                maxLength='42'
                                required 
                                isValid={ethers.utils.isAddress(recipeintAddress)}
                                isInvalid={!ethers.utils.isAddress(recipeintAddress)}
                            />
                            <Form.Control.Feedback type="invalid">
                                Please provide a repient address
                                </Form.Control.Feedback>
                            </InputGroup>
                        </Form.Group>
                        <Form.Group  controlId="ticketAmount">
                            <Form.Label>Amount of tickets</Form.Label>
                            <InputGroup hasValidation>
                                <Form.Control 
                                    type="number"
                                    placeholder="Enter the amount of tickets"
                                    onChange={changeTicketAmountGift}
                                    value={ticketAmountGift}
                                    min='1'
                                    max={Number(currentSupply)}
                                    step='1'
                                    required 
                                    isValid={ticketAmountGift > 0 && ticketAmountGift <= Number(currentSupply)}
                                    isInvalid={ticketAmountGift <= 0 || ticketAmountGift > Number(currentSupply)}
                                />
                                <Form.Control.Feedback type="invalid">
                                    Please provide a valid amount of tickets
                                </Form.Control.Feedback>
                            </InputGroup>
                        </Form.Group>
                        <Button variant="primary" type="submit">
                            Submit
                        </Button>
                    </Form>
                    <p
                    style ={{
                        fontSize: "16px",
                        fontFamily: "monospace",
                        fontWeight: "bold"
                    }}
                    >
                        Total cost : {(Number(price * ticketAmountGift))} TIK
                        <br />
                        New balance : {(Number(balances) - Number(price * ticketAmountGift))} TIK
                    </p>
                </Modal.Body>
            </Modal>
            <Modal
                show={showPersonal}
                onHide={handleClosePersonal}
                centered
            >
                <Modal.Header closeButton>
                <Modal.Title>Purchase tickets</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form
                        noValidate
                        validated={validatedPersonal}
                        onSubmit={handleSubmitPersonal}
                    >
                        <Form.Group  controlId="ticketAmount">
                            <Form.Label>Amount of tickets</Form.Label>
                            <InputGroup hasValidation>
                                <Form.Control 
                                    type="number"
                                    placeholder="Enter the amount of tickets"
                                    onChange={changeTicketAmountPersonal}
                                    value={ticketAmountPersonal}
                                    min='1'
                                    max={Number(currentSupply)}
                                    step='1'
                                    required 
                                    isValid={ticketAmountPersonal > 0 && ticketAmountPersonal <= Number(currentSupply)}
                                    isInvalid={ticketAmountPersonal <= 0 || ticketAmountPersonal > Number(currentSupply)}
                                />
                                <Form.Control.Feedback type="invalid">
                                    Please provide a valid amount of tickets
                                </Form.Control.Feedback>
                            </InputGroup>
                        </Form.Group>
                        <Button variant="primary" type="submit">
                            Submit
                        </Button>
                    </Form>
                    <p
                    style ={{
                        fontSize: "16px",
                        fontFamily: "monospace",
                        fontWeight: "bold"
                    }}
                    >
                        Total cost : {(Number(price * ticketAmountPersonal))} TIK
                        <br />
                        New balance : {(Number(balances) - Number(price * ticketAmountPersonal))} TIK
                    </p>
                </Modal.Body>
            </Modal>
            <div>
                <div className='d-flex justify-content-center'>
                    <h3>{name}</h3>
                </div>
                <p className='desc-text d-flex justify-content-between'>
                    <span>
                        Price: {price}
                    </span>
                    <span>
                        Available: {Number(currentSupply)}
                    </span>
                </p>
                <Button onClick={handleShowPersonal} className="me-6">Buy</Button>
                <Button onClick={handleShowGift}>Gift</Button>
            </div>
            {ticketImage !== undefined ? <Image src={ticketImage} fluid rounded className='m-4'/> : null}
        </div>
    );
});

export default TicketType;