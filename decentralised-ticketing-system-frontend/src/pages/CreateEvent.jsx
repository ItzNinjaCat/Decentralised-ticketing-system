import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { resizeImage } from '../utils/utils';
import { W3LINK_URL } from '../constants/constants';
import { Button, Form, Row, Col, Modal } from 'react-bootstrap';
import TicketInfo from '../components/ui/TicketInfo';
import { useNavigate } from 'react-router-dom';
import { uploadImmutableData } from '../utils/web3.storageEndpoints';
import { useWeb3Context } from '../hooks/useWeb3Context';
import Loader from '../components/ui/Loader';
import { IS_ORGANIZER_QUERY } from '../utils/subgraphQueries';
import { useQuery } from '@apollo/client';
function CreateEvent() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const { account, contract } = useWeb3Context();
  const { loading, error, data } = useQuery(IS_ORGANIZER_QUERY, {
    variables: {
      account: String(account),
    },
  });
  const [validated, setValidated] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState([]);
  const [startTime, setStartTime] = useState(
    new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  );
  const [endTime, setEndTime] = useState('');
  const [startDate, setStartDate] = useState(new Date().toJSON().slice(0, 10).replace(/-/g, '-'));
  const [endDate, setEndDate] = useState('');
  const [ticketTypes, setTicketTypes] = useState([0]);
  const [hasRole, setHasRole] = useState(false);
  const [eventId, setEventId] = useState('');
  const [ticketInputFields, setTicketInputFields] = useState([
    {
      name: '',
      price: 0,
      quantity: 0,
      image: '',
      souvenir: '',
    },
  ]);
  const [loadingButton, setLoadingButton] = useState(false);

  const handleShow = () => setShow(true);
  const handleClose = () => {
    setShow(false);
    navigate(`/events/${eventId}`);
  };

  const getTypeIndex = ticket => {
    return ticketTypes.indexOf(ticket);
  };

  useEffect(() => {
    if (validated) {
      return;
    }
    if (!loading) {
      if (error) {
        navigate('/');
      } else if (data.organizers.length > 0) {
        setHasRole(true);
      } else {
        navigate('/');
      }
    }
  }, [loading, account, data]);

  const handleSubmit = async e => {
    setLoadingButton(true);
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.preventDefault();
      e.stopPropagation();
      setValidated(true);
      setLoadingButton(false);
    } else {
      e.preventDefault();
      e.stopPropagation();
      setValidated(true);
      const creationTime = new Date().getTime() / 1000;
      const startTimeSplit = startTime.split(':');
      let startDateUNIX = new Date(`${startDate}T00:00`);
      startDateUNIX.setHours(startTimeSplit[0]);
      startDateUNIX.setMinutes(startTimeSplit[1]);
      startDateUNIX = startDateUNIX.getTime();
      let endDateUNIX = 0;
      if (endDate !== '' && endTime !== '') {
        const endTimeSplit = endTime.split(':');
        endDateUNIX = new Date(`${endDate}T00:00`);
        endDateUNIX.setHours(endTimeSplit[0]);
        endDateUNIX.setMinutes(endTimeSplit[1]);
        endDateUNIX = endDateUNIX.getTime();
      } else if (endTime !== '') {
        const endTimeSplit = endTime.split(':');
        endDateUNIX = new Date(`${startDate}T00:00`);
        endDateUNIX.setHours(endTimeSplit[0]);
        endDateUNIX.setMinutes(endTimeSplit[1]);
        endDateUNIX = endDateUNIX.getTime();
      } else if (endDate !== '') {
        const tmp = new Date(`${endDate}T00:00`);
        tmp.setMilliseconds(1);
        endDateUNIX = tmp.getTime();
      }
      const eventId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['string'], [name.trim()]),
      );
      setEventId(eventId);
      const ticketCids = [];
      const ticketPromises = ticketInputFields.map(async ticket => {
        const ticketImagesCid = await uploadImmutableData([ticket.image, ticket.souvenir]);
        const ticketMetadata = {
          name: ticket.name.trim(),
          description: `This is a ${ticket.name.trim()} ticket for ${name.trim()}`,
          image: encodeURI(
            `${W3LINK_URL}/${ticketImagesCid}/${ticket.image.name}`,
          ),
          external_url: encodeURI(`${window.location.origin}/events/${eventId}`),
          attributes: {
            price: ticket.price,
            quantity: ticket.quantity,
            createdAt: creationTime,
          },
        };
        ticketCids.push(ticketImagesCid);
        const souvenirMetadata = {
          name: `${ticket.name.trim()} Souvenir`,
          description: `This is a ${ticket.name.trim()} souvenir for ${name.trim()}`,
          image: encodeURI(
            `${W3LINK_URL}/${ticketImagesCid}/${ticket.souvenir.name}`,
          ),
          external_url: encodeURI(`${window.location.origin}/events/${eventId}`),
          attributes: {
            ticketPrice: ticket.price,
            quantity: ticket.quantity,
            createdAt: creationTime,
          },
        };
        const ticketBlob = new Blob([JSON.stringify(ticketMetadata)], { type: 'application/json' });
        const souvenirBlob = new Blob([JSON.stringify(souvenirMetadata)], {
          type: 'application/json',
        });
        return uploadImmutableData([
          new File([ticketBlob], `${ticket.name.trim()}_metadata.json`),
          new File([souvenirBlob], `${ticket.name.trim()}_souvenir_metadate.json`),
        ]);
      });
      Promise.all(ticketPromises).then(async responses => {
        const eventImagesCid = await uploadImmutableData(images);
        const tx = await contract.createEvent(
          name.trim(),
          desc.trim(),
          eventImagesCid,
          location.trim(),
          startDateUNIX,
          endDateUNIX,
        ).catch(e => {
          alert(e.reason);
          setLoadingButton(false);
          return null;
        });
        if(tx === null) return;
        tx.wait().then(() => {
          const ticketTypes = ticketInputFields.map(async (ticket, index) => {
            return await contract.createTicketType(
              eventId,
              ticket.name.trim(),
              encodeURI(
                `${W3LINK_URL}/${
                  responses[index]
                }/${ticket.name.trim()}_metadata.json`,
              ),
              encodeURI(
                `${W3LINK_URL}/${
                  responses[index]
                }/${ticket.name.trim()}_souvenir_metadate.json`,
              ),
              ethers.utils.parseEther(String(ticket.price)),
              ticket.quantity,
              {
                gasLimit: 500000,
              },
            );
          });
          Promise.all(ticketTypes).then(types => {
            Promise.all(
              types.map(type => {
                return type.wait();
              }),
            ).then(() => {
              handleShow();
              setLoadingButton(false);
            }).catch(e => {
              alert(e.reason)
              setLoadingButton(false);
            });
          });
        });
      });
    }
  };
  const changeStartDate = e => {
    if (e.target.value === '') {
      setStartDate(new Date().toJSON().slice(0, 10).replace(/-/g, '-'));
      return;
    }
    setStartDate(e.target.value);
    if (new Date(`${startDate}T00:00`).getTime() > new Date(`${endDate}T00:00`).getTime()) {
      setEndDate(0);
    }
  };

  const uploadEventImages = e => {
    if (Array.from(e.target.files).length > 5) {
      e.preventDefault();
      alert('You can upload up to 5 images');
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
        alert('File size cannot be larger than 10MB');
        removeIndexes.push(index);
      }
      if (!file.type.match('image.*')) {
        e.preventDefault();
        alert('Only images are allowed');
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
    Promise.all(images).then(images => {
      images.forEach(image => {
        items.items.add(image);
      });
      e.target.files = items.files;
      setImages(e.target.files);
    });
  };

  const addTicketInfo = () => {
    let newArr = [...ticketTypes];
    newArr.push(ticketTypes[ticketTypes.length - 1] + 1);
    setTicketTypes(newArr);
    const values = [...ticketInputFields];
    values.push({
      name: '',
      price: 0,
      quantity: 0,
      image: '',
      souvenir: '',
    });
    setTicketInputFields(values);
  };

  if (loading && !hasRole) return <Loader />;

  return (
    <div className="my-5 d-flex flex-column align-items-center">
      <h1>Create event</h1>
      <Form noValidate validated={validated} onSubmit={handleSubmit}>
        <Row className="mb-3">
          <Form.Group as={Col} controlId="eventName">
            <Form.Label>Event name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter event name"
              onChange={e => setName(e.target.value)}
              value={name}
              maxLength="30"
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
              required
            />
            <Form.Text className="text-muted">
              The first image will be used as a thumbnail
              <br />
              Please use 16 x 9 aspect ratio for best results
            </Form.Text>
            <Form.Control.Feedback type="invalid">
              Please provide at least one event image.
            </Form.Control.Feedback>
          </Form.Group>
        </Row>
        <Form.Group controlId="eventLocation">
          <Form.Label>Event location</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter event location"
            onChange={e => setLocation(e.target.value)}
            value={location}
            maxLength="100"
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
              type="date"
              required
              min={new Date().toJSON().slice(0, 10).replace(/-/g, '-')}
              value={startDate}
              onChange={changeStartDate}
            />
          </Form.Group>
          <Form.Group as={Col} controlId="eventEndDate">
            <Form.Label>Event end date</Form.Label>
            <Form.Control
              type="date"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
            />
            <Form.Text className="text-muted">Only required for multi-day events</Form.Text>
          </Form.Group>
        </Row>
        <Row className="mb-3">
          <Form.Group as={Col} controlId="eventStartTime">
            <Form.Label>Event starting time</Form.Label>
            <Form.Control
              type="time"
              required
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />
          </Form.Group>
          <Form.Group as={Col} controlId="eventEndTime">
            <Form.Label>Event end time</Form.Label>
            <Form.Control type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
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
            onChange={e => setDesc(e.target.value)}
            value={desc}
            required
            maxLength="200"
          />
          <Form.Control.Feedback type="invalid">
            Please provide an event description.
          </Form.Control.Feedback>
        </Form.Group>
        {ticketTypes.map(ticket => (
          <TicketInfo
            key={ticket}
            ticketInputFields={ticketInputFields}
            setTicketInputFields={setTicketInputFields}
            index={getTypeIndex(ticket)}
            ticketTypes={ticketTypes}
            setTicketTypes={setTicketTypes}
          />
        ))}
        <div className="d-flex justify-content-between">
          <Button variant="light" onClick={addTicketInfo}>
            Add ticket
          </Button>
          <Button disabled={loadingButton} variant="primary" type="submit">
            {loadingButton ? 'Loading...' : 'Submit'}
          </Button>
        </div>
      </Form>
      <Modal show={show} centered onHide={handleClose} backdrop="static" keyboard={false}>
        <Modal.Header closeButton>
          <Modal.Title>Success</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex flex-column align-items-center">
            <p
              style={{
                fontSize: '16px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
              }}
            >
              Event created successfully
            </p>
            <Button variant="primary" onClick={handleClose}>
              Continue
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default CreateEvent;
