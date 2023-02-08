import React, { useEffect, useState } from 'react';
import { Tabs, Tab } from 'react-bootstrap';
import CreateOfferModal from '../components/ui/CreateOfferModal';
import { useQuery } from '@apollo/client';
import { BUY_OFFERS_QUERY, SELL_OFFERS_QUERY } from '../utils/subgraphQueries';
import Offer from '../components/ui/Offer';
import Loader from '../components/ui/Loader';
import UserOffersModal from '../components/ui/UserOffersModal';
import InfiniteScroll from '@alexcambose/react-infinite-scroll';
import { useWeb3Context } from "../hooks/useWeb3Context";
import { ethers } from 'ethers';

function Marketplace() {
  const [offerType, setOfferType] = useState('buy');
  const [buyOffers, setBuyOffers] = useState([]);
  const [sellOffers, setSellOffers] = useState([]);
  const [hasMoreBuyOffers, setHasMoreBuyOffers] = useState(true);
  const [hasMoreSellOffers, setHasMoreSellOffers] = useState(true);
  const { account } = useWeb3Context();
  const { data: dataBuy, loading: loadingBuy, fetchMore: fetchMoreBuy, error } = useQuery(BUY_OFFERS_QUERY, {
    variables: {
      skip: 0,
      first: 20,
      account: account === undefined ? String(ethers.constants.AddressZero) : String(account?.toLowerCase())
    }
  });
  const { data: dataSell, loading: loadingSell, fetchMore: fetchMoreSell } = useQuery(SELL_OFFERS_QUERY, {
    variables: {
      skip: 0,
      first: 20,
      account: account === undefined ? String(ethers.constants.AddressZero) : String(account?.toLowerCase())
    }
  });

  useEffect(() => {
    if (!loadingBuy) {
      setBuyOffers(dataBuy.offers);
    }
  }, [dataBuy, loadingBuy, offerType, account]);

  useEffect(() => {
    if (!loadingSell) {
      setSellOffers(dataSell.offers);
    }
  }, [dataSell, loadingSell, offerType]);


  const loadMoreBuyOffers = () => {
    fetchMoreBuy({
      variables: {
        skip: buyOffers.length,
      }
    }).then((res) => {
      setBuyOffers([...buyOffers, ...res.data.offers]);
      if (res.data.offers.length < 20) {
        setHasMoreBuyOffers(false);
      }
    });
  };

  const loadMoreSellOffers = () => {
    fetchMoreSell({
      variables: {
        skip: sellOffers.length,
      }
    }).then((res) => {
      setSellOffers([...sellOffers, ...res.data.offers]);
      if (res.data.offers.length < 20) {
        setHasMoreSellOffers(false);
      }
    });
  };
  if(loadingBuy || loadingSell ) return <Loader />;
  return (
    <>
      <div className='d-flex justify-content-between container mt-4'>
        <h2>Marketplace</h2>
        {account !== undefined ?
          <div className='d-flex'>
            <div className='me-3'>
              <CreateOfferModal/>
            </div>
            <UserOffersModal />
          </div> : null}
      </div>
      <div className="mt-5">
        <Tabs
          activeKey={offerType}
          onSelect={(k) => setOfferType(k)}
          fill
        >
          <Tab eventKey="buy" title="Buy Offers">
            {
              offerType === 'buy' ?
            <InfiniteScroll
            hasMore={hasMoreBuyOffers} loadMore={loadMoreBuyOffers} initialLoad={false} noMore={false}
            >
          <div className='d-flex justify-content-center flex-wrap mt-5'>
          {
            buyOffers?.map((off, index) => {
              if (index % 4 === 0) {
                return (
                  <div key={index} className='row w-75 d-flex justify-content-start'>
                    {
                      buyOffers.slice(index, index + 4).map((offer) =>
                        <div key={offer.id} className='w-25 col-3 d-flex flex-wrap text-wrap ticket-card'>
                          <Offer key={offer.id} offer={offer} />
                        </div>
                      )
                    }
                  </div>
                )
              }
              return null;
            })
              } 
          </div>
          </InfiniteScroll> : null 
            }
          </Tab>
          <Tab eventKey="sell" title="Sell Offers">
            {
              offerType === 'sell' ?
             <InfiniteScroll
                    hasMore={hasMoreSellOffers} loadMore={loadMoreSellOffers} initialLoad={false} noMore={false}
                    >
                  <div className='d-flex justify-content-center flex-wrap mt-5'>
                    {
                      sellOffers?.map((off, index) => {
                        if (index % 4 === 0) {
                          return (
                            <div key={index} className='row w-75 d-flex justify-content-start'>
                              {
                                sellOffers.slice(index, index + 4).map((offer) =>
                                  <div key={offer.id} className='w-25 col-3 d-flex flex-wrap text-wrap ticket-card'>
                                    <Offer key={offer.id} offer={offer} />
                                  </div>
                                )
                              }
                            </div>
                          )
                        }
                        return null;
                      })
                      }
                  </div>
                </InfiniteScroll> : null
                }
          </Tab>
        </Tabs> 
        </div>
      </>
  );
}

export default Marketplace;