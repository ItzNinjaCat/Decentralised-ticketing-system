
import { Modal, Button } from 'react-bootstrap';
import React, { useEffect, useState } from 'react';
import Image from 'react-bootstrap/Image';
import QRCode from "react-qr-code";
import { useNavigate } from 'react-router-dom';
import { useWeb3Context } from "../../hooks/useWeb3Context";
function Ticket({
    ticket,
    event,
    ticketType,
}) {
    const [ticketMetadata, setTicketMetadata] = useState(undefined);
    const [show, setShow] = useState(false);
    const navigate = useNavigate();
    const { contract } = useWeb3Context();
    function getSouvenir() {
        contract.getSouvenir(ticket.id).then((res) => {
            setShow(false);
            res.wait().then(() => {
                alert("Successfully minted souvenir!");
            });
        }).catch((e) => {
            alert(e.reason);
        });
    }
    useEffect(() => {
        fetch((ticket.tokenURI)).then(res => {
            res.json().then(metadata => {
                setTicketMetadata(metadata);
            });
        });
    }, [ticket.tokenURI]);
    return (
        <>
        <div role="button" onClick={() => setShow(true)}>
            <Image src={ticketMetadata?.image} fluid rounded />
            <p className='desc-text d-flex justify-content-between'>
                <span>Event: {event?.name}</span>
                <span>Id: {Number(ticket?.id)}</span>
            </p>
            <p className='desc-text d-flex justify-content-between '>
                <span>Name: {ticketType?.name}</span>
                <span>{event === undefined ? null : new Date(Number(event?.startTime)).toLocaleString().slice(0, -3)}</span>
                </p>
                {ticketMetadata !== undefined ? 
            <p className='desc-text d-flex justify-content-between'>
                <span>Price: {(ticketMetadata?.attributes.price)}</span>
                <span>Total tickets: {Number(ticketMetadata?.attributes.quantity)}</span>
            </p> : null}
        </div>
        <Modal
            show={show}
            onHide={() => setShow(false)}
            centered
            keyboard={false}
            dialogClassName='ticket-modal-w'
        >
        <Modal.Header closeButton>
          <Modal.Title>Ticket information</Modal.Title>
        </Modal.Header>
                <Modal.Body>
                    <div className='d-flex justify-content-center align-items-center me-4'>
                        <div className='d-flex flex-column justify-content-center align-items-start'>
                                <p>Event name: {event?.name}</p>
                                {
                                    (ticketType !== undefined) ? 
                                    <>
                                    <p>Ticket name: {ticketType?.name}</p>
                                    <p>Ticket description: {ticketMetadata?.description}</p>
                                    <p>Price: {(ticketMetadata?.attributes.price)}</p>
                                    <p>Total tickets: {Number(ticketMetadata?.attributes.quantity)}</p>
                                    </> : null
                                }
                                <p>Event start time: {new Date(Number(event?.startTime)).toLocaleString().slice(0, -3)}</p>
                                {
                                    Number(event?.endTime) === 0 ? null :
                                        <p>Event end time: {new Date(Number(event?.endTime)).toLocaleString().slice(0, -3)}</p>
                                }
                        </div>
                        <QRCode value={`${window.location.origin}/use/${ticket?.id}`} />
                    </div>
                </Modal.Body>
                <Modal.Footer className='d-flex justify-content-between'>
                                <Button onClick={() => navigate(`/events/${event?.id}`)}>Go to event's page</Button>
                    {
                        (!ticket.souvenirMinted) && ticket.used ? 
                        <Button onClick={getSouvenir}>
                            Get souvenir
                        </Button> : null
                    }
                </Modal.Footer>
        </Modal>    
        </>
    );
}

export default Ticket;
