import { useNavigate, useParams } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { Form, Row, Col, Button, Modal } from "react-bootstrap";
import { EVENT_BY_ID_QUERY } from "../utils/subgraphQueries";
import { useQuery } from "@apollo/client";
import { uploadImmutableData } from '../utils/web3.storageEndpoints';
import { useWeb3Context } from "../hooks/useWeb3Context";
import Loader from "../components/ui/Loader";
import { resizeImage } from "../utils/utils";
function EditEvent() {
    const { account, contract } = useWeb3Context();
    const [show, setShow] = useState(false);
    const { id } = useParams();
    const navigate = useNavigate();
    const [validated, setValidated] = useState(false);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [location, setLocation] = useState('');
    const [images, setImages] = useState(undefined);
    const [cid, setCid] = useState(undefined);
    const [acc, setAcc] = useState(undefined);
    const [startTime, setStartTime] = useState(new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    }));
    const [endTime, setEndTime] = useState(0);
    const [startDate, setStartDate] = useState(new Date().toJSON().slice(0,10).replace(/-/g,'-'));
    const [endDate, setEndDate] = useState(0);
    const { loading, data } = useQuery(EVENT_BY_ID_QUERY, {
        variables: {
            id: String(id)
        }
    });

    const handleShow = () => setShow(true);
    const handleClose = () => {
        setShow(false);
        navigate(`/events/${id}/dashboard`);
    }

    useEffect(() => {
        if (acc !== undefined && acc === account?.toLowerCase()) {
            return;
        }
        if (!loading) {
            try {
                if(data.event.creator !== account?.toLowerCase()){
                    navigate('/');
                }
                else {
                    setAcc(data.event.creator);
                }
            }catch(e){
                navigate('/');
            }
        }
    }, [loading, data, account]);


    useEffect(() => {
        if (!loading) {
            setName(data.event.name);
            setDesc(data.event.description);
            setLocation(data.event.location);
            setStartTime(new Date(Number(data.event.startTime)).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            }));
            if (Number(data.event.endTime) !== 0) {
                setEndTime(new Date(Number(data.event.endTime)).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                }));
                setEndDate(new Date(Number(data.event.endTime)).toJSON().slice(0, 10).replace(/-/g, '-'));
            }
            setStartDate(new Date(Number(data.event.startTime)).toJSON().slice(0, 10).replace(/-/g, '-'));
            setCid(data.event.eventStorage);
        }
    }, [loading, data, id]);

    const handleSubmit = async (e) => {
        const form = e.currentTarget;
        if (form.checkValidity() === false) {
            e.preventDefault();
            e.stopPropagation();
            setValidated(true);
        }
        else {
            e.preventDefault();
            e.stopPropagation();
            setValidated(true);
            const startTimeSplit = startTime.split(':');
            let startDateUNIX = new Date(`${startDate}T00:00`)
            startDateUNIX.setHours(startTimeSplit[0]);
            startDateUNIX.setMinutes(startTimeSplit[1]);
            startDateUNIX = startDateUNIX.getTime();
            let endDateUNIX = 0;
            if (endDate !== 0 && endTime !== 0) {
                const endTimeSplit = endTime.split(':');
                endDateUNIX = new Date(`${endDate}T00:00`)
                endDateUNIX.setHours(endTimeSplit[0]);
                endDateUNIX.setMinutes(endTimeSplit[1]);
                endDateUNIX = endDateUNIX.getTime();
            }
            else if (endTime !== 0) {
                const endTimeSplit = endTime.split(':');
                endDateUNIX = new Date(`${startDate}T00:00`)
                endDateUNIX.setHours(endTimeSplit[0]);
                endDateUNIX.setMinutes(endTimeSplit[1]);
                endDateUNIX = endDateUNIX.getTime();
            }
            else if (endDate !== 0) {
                const tmp = new Date(`${endDate}T00:00`);
                tmp.setMilliseconds(1);
                endDateUNIX = tmp.getTime();
            }
            let imagesCid;
            if (images !== undefined) {
                imagesCid = (await uploadImmutableData(images));
            }
            else {
                imagesCid = cid;
            }
            const tx = await contract.updateEvent(id, name.trim(), desc.trim(), imagesCid, location.trim(), startDateUNIX, endDateUNIX);
            tx.wait().then(() => handleShow());

        } 
    }
    const changeStartDate = (e) => {
        setStartDate(e.target.value);
        if(new Date(`${startDate}T00:00`).getTime() > new Date(`${endDate}T00:00`).getTime()) {
            setEndDate(0);
        }
    }

    const uploadEventImages = (e) => {
        if (Array.from(e.target.files).length > 5) {
            e.preventDefault();
            alert("You can upload up to 5 images");
            const items = new DataTransfer();
            Array.from(e.target.files).forEach((fileObj, i) => {
                if (i < 5) {
                    items.items.add(fileObj);
                }
            });
            e.target.files = items.files;
        }
        let removeIndexes = [];
        Array.from(e.target.files).forEach((file, index) => {
            if (file.size > 1024 * 1024 * 10) {
                e.preventDefault();
                alert("File size cannot be larger than 10MB");
                removeIndexes.push(index);
            }
            if(!file.type.match('image.*')) {
                e.preventDefault();
                alert("Only images are allowed");
                removeIndexes.push(index);
            }
        });
        const items = new DataTransfer();
        const images = [];
        Array.from(e.target.files).forEach((fileObj, i) => {
            if (!removeIndexes.includes(i)) {
                images.push(resizeImage(fileObj));
            }
        });
        Promise.all(images).then((images) => {
            images.forEach((image) => {
                items.items.add(image);
            });
            e.target.files = items.files;
            setImages(e.target.files);
        });
    }
    if (loading) return <Loader />;
    return (
        <div className="mt-5 d-flex flex-column align-items-center">
            <h1>Update event</h1>
            <Form 
                noValidate
                validated={validated}
                onSubmit={handleSubmit}
            >
                <Row className="mb-3">
                    <Form.Group as={Col}  controlId="eventName">
                        <Form.Label>Event name</Form.Label>
                        <Form.Control 
                            type="text"
                            placeholder="Enter event name"
                            onChange={(e) => setName(e.target.value)}
                            value={name}
                            maxLength='30'
                            required 
                        />
                        <Form.Control.Feedback type="invalid">
                            Please provide an event name.
                        </Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group controlId="eventImages" as={Col}>
                        <Form.Label>Event images</Form.Label>
                        <Form.Control 
                            type="file"
                            accept=".jpg, .png, .jpeg, .gif"
                            multiple 
                            onChange={uploadEventImages}
                        />
                        <Form.Text className="text-muted">
                            The first image will be used as a thumbnail
                        </Form.Text>
                    </Form.Group>
                </Row>
                <Form.Group controlId="eventLocation">
                    <Form.Label>Event location</Form.Label>
                    <Form.Control 
                        type="text"
                        placeholder="Enter event location"
                        onChange={(e) => setLocation(e.target.value)}
                        value={location}
                        maxLength='100'
                        required 
                    />
                    <Form.Control.Feedback type="invalid">
                        Please provide an event location.
                    </Form.Control.Feedback>
                </Form.Group>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="eventStartDate">
                        <Form.Label>Event start date</Form.Label>
                        <Form.Control
                            type='date'
                            required
                            min={new Date().toJSON().slice(0,10).replace(/-/g,'-')}
                            value={startDate}
                            onChange={changeStartDate}
                        />
                    </Form.Group>
                    <Form.Group as={Col} controlId="eventEndDate">
                        <Form.Label>Event end date</Form.Label>
                        <Form.Control
                            type='date'
                            value={endDate}
                            min={startDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                        <Form.Text className="text-muted">
                            Only required for multi-day events
                        </Form.Text>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="eventStartTime">
                        <Form.Label>Event starting time</Form.Label>
                        <Form.Control
                            type='time'
                            required
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                        />
                    </Form.Group>
                    <Form.Group as={Col} controlId="eventEndTime">
                        <Form.Label>Event end time</Form.Label>
                        <Form.Control
                            type='time'
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />
                        <Form.Text className="text-muted">
                            Only required if you want your event to have a set end hour
                        </Form.Text>
                    </Form.Group>
                </Row>
                    <Form.Group as={Col} controlId="eventDescription">
                        <Form.Label>Event description</Form.Label>
                        <Form.Control 
                            as="textarea" 
                            rows={3} 
                            placeholder="Enter event description"
                            onChange={(e) => setDesc(e.target.value)}
                            value={desc}
                            required 
                            maxLength='200'
                        />
                        <Form.Control.Feedback type="invalid">
                            Please provide an event description.
                        </Form.Control.Feedback>
                    </Form.Group>
                    <div className="d-flex justify-content-between mt-5">
                        <Button variant="primary" type="submit">
                            Submit
                        </Button>
                    </div>
            </Form>
            <Modal
                show={show}
                onHide={handleClose}
                backdrop="static"
                keyboard={false}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>Event updated</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div>
                        <p
                            style ={{
                                fontSize: "16px",
                                fontFamily: "monospace",
                                fontWeight: "bold"
                            }}
                        >
                            Event has been updated successfully
                        </p>
                        <Button variant="primary" onClick={handleClose}>Continue</Button>
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    );
}
    
export default EditEvent;