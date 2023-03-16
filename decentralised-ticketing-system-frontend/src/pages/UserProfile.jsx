import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import {
  ALL_TICKETS_BY_OWNER_QUERY,
  USED_TICKETS_BY_OWNER_QUERY,
  USED_NOT_MINTED_TICKETS_BY_OWNER_QUERY,
  CURRENT_TICKETS_BY_OWNER_QUERY,
  OFFERED_TICKETS_BY_OWNER_QUERY,
  SOUVENIRS_BY_OWNER_QUERY,
} from '../utils/subgraphQueries';
import TicketInfiniteScroll from '../components/ui/TicketInfiniteScroll';
import { useParams, useNavigate } from 'react-router-dom';
import '../style/style.scss';
import Loader from '../components/ui/Loader';
import { Tabs, Tab } from 'react-bootstrap';
import { useWeb3Context } from '../hooks/useWeb3Context';
import Souvenir from '../components/ui/Souvenir';
import InfiniteScroll from '@alexcambose/react-infinite-scroll';
function UserProfile() {
  const [souvenirs, setSouvenirs] = useState([]);
  const [hasMoreSouvenirs, setHasMoreSouvenirs] = useState(true);
  const [initialLoadSouvenirs, setInitialLoadSouvenirs] = useState(true);
  const [isAuthorised, setIsAuthorised] = useState(undefined);
  const [tab, setTab] = useState('tickets');
  const [ticketTab, setTicketTab] = useState('current');
  const { account, contract, isActive } = useWeb3Context();
  const { address } = useParams();
  const {
    loading: loadingSouvenirs,
    error: errorSouvenirs,
    data: dataSouvenirs,
    fetchMore: fetchMoreSouvenirs,
  } = useQuery(SOUVENIRS_BY_OWNER_QUERY, {
    variables: {
      owner: String(address).toLowerCase(),
      first: 20,
      skip: 0,
    },
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (
      !isActive &&
      !loadingSouvenirs &&
      (initialLoadSouvenirs || isAuthorised !== undefined) &&
      account === undefined
    )
      navigate('/');
    if (isActive && account !== address) {
      navigate(`/user/${account}`);
    }
    if (isActive && account === address) {
      setIsAuthorised(true);
    }
  }, [isActive, account, address, loadingSouvenirs]);

  useEffect(() => {
    if (!loadingSouvenirs) {
      if (dataSouvenirs.souvenirs.length < 20) setHasMoreSouvenirs(false);
      setInitialLoadSouvenirs(false);
      setSouvenirs(dataSouvenirs.souvenirs);
    }
  }, [address, loadingSouvenirs]);

  const loadMoreSouvenirs = () => {
    fetchMoreSouvenirs({
      variables: {
        owner: String(address),
        first: 20,
        skip: souvenirs.length,
      },
    }).then(res => {
      if (res.data.souvenirs.length < 20) setHasMoreSouvenirs(false);
      setSouvenirs([...souvenirs, ...res.data.souvenirs]);
    });
  };

  if (loadMoreSouvenirs && initialLoadSouvenirs) return <Loader />;
  if (errorSouvenirs) return <p>Error: {errorSouvenirs.message}</p>;
  return (
    <div className="container">
      <div className="my-4">
        <h1>User profile</h1>
      </div>
      <Tabs activeKey={tab} onSelect={k => setTab(k)} fill>
        <Tab eventKey="tickets" title="Tickets">
          <Tabs activeKey={ticketTab} onSelect={k => setTicketTab(k)} fill>
            <Tab eventKey="current" title="Current">
              {ticketTab === 'current' ? (
                <TicketInfiniteScroll
                  query={CURRENT_TICKETS_BY_OWNER_QUERY}
                  address={address}
                  contract={contract}
                />
              ) : null}
            </Tab>
            <Tab eventKey="used" title="Used">
              {ticketTab === 'used' ? (
                <TicketInfiniteScroll
                  query={USED_TICKETS_BY_OWNER_QUERY}
                  address={address}
                  contract={contract}
                />
              ) : null}
            </Tab>
            <Tab eventKey="used(not minted)" title="Used(No souvenir)">
              {ticketTab === 'used(not minted)' ? (
                <TicketInfiniteScroll
                  query={USED_NOT_MINTED_TICKETS_BY_OWNER_QUERY}
                  address={address}
                  contract={contract}
                />
              ) : null}
            </Tab>
            <Tab eventKey="offered" title="Offered">
              {ticketTab === 'offered' ? (
                <TicketInfiniteScroll
                  query={OFFERED_TICKETS_BY_OWNER_QUERY}
                  address={address}
                  contract={contract}
                />
              ) : null}
            </Tab>
            <Tab eventKey="all" title="All">
              {ticketTab === 'all' ? (
                <TicketInfiniteScroll
                  query={ALL_TICKETS_BY_OWNER_QUERY}
                  address={address}
                  contract={contract}
                />
              ) : null}
            </Tab>
          </Tabs>
        </Tab>
        <Tab eventKey="souvenirs" title="Souvenirs">
          {tab === 'souvenirs' ? (
            <InfiniteScroll
              hasMore={hasMoreSouvenirs}
              loadMore={loadMoreSouvenirs}
              initialLoad={false}
              noMore={false}
            >
              <div className="row mt-10">
                {souvenirs.map((souvenir, index) => (
                  <div key={index} className="col-3 event-card">
                    <Souvenir key={souvenir.id} souvenir={souvenir} />
                  </div>
                ))}
              </div>
            </InfiniteScroll>
          ) : null}
        </Tab>
      </Tabs>
    </div>
  );
}

export default UserProfile;
