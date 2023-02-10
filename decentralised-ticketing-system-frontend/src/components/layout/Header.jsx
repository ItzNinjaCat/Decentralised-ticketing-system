import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import SelectWalletModal from '../ui/ConnectModal';
import Deposit from '../ui/Deposit';
import Withdraw from '../ui/Withdraw';
import { Button, Navbar, Nav, Offcanvas, Container } from 'react-bootstrap';
import { CgProfile } from 'react-icons/cg';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { useWeb3Context } from "../../hooks/useWeb3Context";
function Header() {
  const navigate = useNavigate();
  function createEvent() {
    navigate('/create-event');
  }



  function becomeOrganizer() {
    contract.becomeOrganizer().then(res => {
      res.wait().then((res) => {
        alert('You are now an organizer');
        setIsOrganizer(true);
      });
    }).catch((e) => {
      alert(e.reason);
    });
  }

  function ownerWithdraw() {
    contract.ownerWithdraw().catch((e) => {
      if(e.reason !== undefined){
        alert(e.reason);
      }
    });
  }

  const { connector, provider, account, isActive, balance, contract } = useWeb3Context();
  
  const [isOrganizer, setIsOrganizer] = useState(undefined);
  const [isOwner, setIsOwner] = useState(undefined);
  useEffect(() => {
    if (provider && account && contract) {
      contract.hasRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes('ORGANIZER_ROLE')), account).then(
        (status) => {
          setIsOrganizer(status)
        });
      contract.hasRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes('OWNER_ROLE')), account).then(
        (status) => {
          setIsOwner(status)
        });
    }
  }, [provider, account, contract])
  useEffect(() => {
    connector.connectEagerly().catch(() => {
      console.debug('Failed to connect eagerly')
    });
  }, [connector])

  function organizerProfile() {
    navigate(`/organizer/${account}`);
  }

  return (
    <Navbar bg="light" expand="xl" sticky="top">
      <Container fluid>
        <Navbar.Brand href="/">Decentralized ticketing system</Navbar.Brand>
        <Navbar.Toggle aria-controls="navBar" />
          <Navbar.Offcanvas
              id="navBar"
              aria-labelledby="navBar"
              placement="end"
            >
            <Offcanvas.Header closeButton>
              <Offcanvas.Title id="navBar">
                Decentralized ticketing system
              </Offcanvas.Title>
            </Offcanvas.Header>
          <Offcanvas.Body
            className="align-items-center justify-content-between"
          >
              <Nav
                className="d-flex align-items-center"
              >
                <Nav.Link href="/events">Events</Nav.Link>
                <Nav.Link href="/marketplace">Marketplace</Nav.Link>
              </Nav>
              {
              account !== undefined && isOrganizer !== undefined && isOwner !== undefined ?
                
                    (
                      isOrganizer ? 
                        <div> 
                          <Button className="me-3" onClick={createEvent}>Create event</Button>
                          <Button onClick={organizerProfile}>Your events</Button>
                        </div>
                  : 
                  <Button onClick={becomeOrganizer}>Become an organizer</Button>
                  )
                  : null 
              }
                {isOwner ? <Button className="ms-3" onClick={ownerWithdraw}>Withdraw fees</Button> : null}

              {isActive ?
                <div className="d-flex align-items-center">
                <div className="d-flex flex-column align-items-end mx-2">
                  <code className='me-3'>{account}</code>
                  <div className="d-flex align-items-center justify-content-between w-100">
                    <div className='me-2'>
                      <Deposit/>
                    </div>
                    <div className='me-1'>
                      <Withdraw/>
                    </div>
                    <code className='me-2'>Balance: {balance} Tik</code>
                  </div>
                </div>
                <Link to={`/user/${account}`} className='text-secondary'><CgProfile size="3em"/></Link>
                </div>
              : <SelectWalletModal/>
              }
          </Offcanvas.Body>
        </Navbar.Offcanvas>
      </Container>
    </Navbar>
  );
}

export default Header;
