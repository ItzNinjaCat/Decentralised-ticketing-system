import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import TicketType from '../components/ui/TicketType';
import { W3LINK_URL } from '../constants/constants';
import { ethers } from 'ethers';
import Loader from '../components/ui/Loader';
import { useQuery } from '@apollo/client';
import { EVENT_BY_ID_WITH_TICKETS_QUERY } from '../utils/subgraphQueries';
import { getData } from '../utils/web3.storageEndpoints';
import ImageGallery from 'react-image-gallery';
function Event() {
  const { eventId } = useParams();
  const [imageUrls, setImageUrls] = useState([]);
  const { loading, data } = useQuery(EVENT_BY_ID_WITH_TICKETS_QUERY, {
    variables: { id: String(eventId) },
  });

  useEffect(() => {
    if (!loading) {
      getData(data.event.eventStorage).then(res => {
        res.files().then(files => {
          setImageUrls(
            files.map(file => {
              return {
                original: `${W3LINK_URL}/${data.event.eventStorage}/${
                  file.name
                }`,
              };
            }),
          );
        });
      });
    }
  }, [loading]);
  if (loading) return <Loader />;

  return (
    <div className="container mt-5">
      <div className="">
        <h2>{data.event.name}</h2>
      </div>
      <hr className="my-4" />

      <div className="row">
        <div className="col-md-6">
          {imageUrls.length > 0 ? (
            <ImageGallery
              items={imageUrls}
              showPlayButton={false}
              showFullscreenButton={false}
              showBullets={imageUrls.length > 1}
              showNav={imageUrls.length > 1}
              showThumbnails={false}
              slideDuration={300}
            />
          ) : null}
        </div>

        <div className="col-md-3 mt-5 mt-md-0">
          <p className="text-lead text-bold">Event Information</p>
          <p className="mt-5">
            <span className="text-bold">Date:</span>
            <span>
              {`
                        ${new Date(Number(data.event.startTime)).toLocaleDateString()}
                        ${new Date(Number(data.event.startTime)).toLocaleTimeString().slice(0, -3)}
                        ${`
                            ${
                              Number(data.event.endTime) === 0
                                ? ''
                                : new Date(Number(data.event.endTime)).toLocaleDateString() ===
                                  new Date(Number(data.event.startTime)).toLocaleDateString()
                                ? ` - ${new Date(Number(data.event.endTime))
                                    .toLocaleTimeString()
                                    .slice(0, -3)}`
                                : new Date(Number(data.event.endTime)).getMilliseconds() !== 1 
                                ? ` - ${new Date(Number(data.event.endTime)).toLocaleDateString()}
                                    ${new Date(Number(data.event.endTime))
                                      .toLocaleTimeString()
                                      .slice(0, -3)}`
                                : ` - ${new Date(Number(data.event.endTime)).toLocaleDateString()}`
                                  
                            }
                        `}

                        `}
            </span>
          </p>

          <p className="mt-2">
            <span className="text-bold">Location:</span> {data.event.location}
          </p>

          <p className="mt-2 mb-5">{data.event.description}</p>
        </div>

        <div className="col-md-3 mt-5 mt-md-0">
          {data.event.ticketTypes.map((type) => {
            return (
              <div key={type.id} className="ticket-card p-4">
                <TicketType
                  eventId={eventId}
                  ticketTypeId={type.id}
                  name={type.name}
                  price={ethers.utils.formatEther(type.price)}
                  eventName={data.event.name}
                  currentSupply={type.currentSupply}
                  tokenURI={type.tokenURI}
                  souvenirTokenURI={type.souvenirTokenURI}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Event;
