import React from 'react';
import { useNavigate } from 'react-router-dom';
import Image from 'react-bootstrap/Image';
import { getData } from '../../utils/web3.storageEndpoints';
import { W3LINK_URL } from '../../constants/constants';
function fetchImageUrls(storageBytes, setImageUrls) {
  getData(storageBytes).then(res => {
    res.files().then(files => {
      setImageUrls(
        files.map(file => {
          return `${W3LINK_URL}/${storageBytes}/${file.name}`;
        }),
      );
    });
  });
}

function EventCard({ name, location, imagesCid, url, startTime, endTime }) {
  const navigate = useNavigate();
  const [imageUrls, setImageUrls] = React.useState([]);
  React.useEffect(() => {
    Promise.resolve(fetchImageUrls(imagesCid, setImageUrls));
  }, [imagesCid]);
  function openEventPage() {
    navigate(url);
  }
  if (imageUrls?.length === 0) return null;
  return (
    <>
      <div role="button" onClick={openEventPage}>
        {imageUrls.length > 0 ? <Image src={imageUrls[0]} className="mt-2" fluid rounded /> : null}
        <h4 className="text-break mt-4">{name}</h4>
        <p className="text-break desc-text mt-2">{location}</p>
        <p className="text-break desc-text mt-2">
          {`
                        ${new Date(Number(startTime)).toLocaleDateString()}
                        ${new Date(Number(startTime)).toLocaleTimeString().slice(0, -3)}
                        ${`
                            ${
                              Number(endTime) === 0
                                ? ''
                                : new Date(Number(endTime)).toLocaleDateString() ===
                                  new Date(Number(startTime)).toLocaleDateString()
                                ? ` - ${new Date(Number(endTime))
                                    .toLocaleTimeString()
                                    .slice(0, -3)}`
                                : new Date(Number(endTime)).getMilliseconds() !== 1 
                                ? ` - ${new Date(Number(endTime)).toLocaleDateString()}
                                    ${new Date(Number(endTime))
                                      .toLocaleTimeString()
                                      .slice(0, -3)}`
                                : ` - ${new Date(Number(endTime)).toLocaleDateString()}`
                            }
                        `}

                        `}
        </p>
      </div>
    </>
  );
}

export default EventCard;
