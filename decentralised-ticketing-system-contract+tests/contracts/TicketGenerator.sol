// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import './Structs.sol';
import './TIK.sol';
import './SouvenirGenerator.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';

import 'hardhat/console.sol';

contract TicketGenerator is AccessControl, ERC721URIStorage {
  event Deposit(address indexed sender, uint256 amount);
  event Withdraw(address indexed receiver, uint256 amount);
  event CreateEvent(
    address indexed creator,
    bytes32 eventId,
    string name,
    string description,
    string eventStorage,
    string location,
    uint256 startTime,
    uint256 endTime
  );

  event UpdateEvent(
    address indexed creator,
    bytes32 eventId,
    string name,
    string description,
    string eventStorage,
    string location,
    uint256 startTime,
    uint256 endTime
  );

  event DeleteEvent(address indexed creator, bytes32 eventId);

  event CreateTicketType(address indexed creator, bytes32 eventId, Structs.TicketType ticketType);

  event UpdateTicketType(address indexed creator, bytes32 eventId, Structs.TicketType ticketType);

  event DeleteTicketType(address indexed creator, bytes32 eventId, bytes32 ticketTypeId);

  event BuyTicket(
    address indexed buyer,
    address indexed owner,
    bytes32 eventId,
    bytes32 ticketTypeId,
    uint256 tokenId,
    string tokenURI
  );

  event GenerateSouvenir(
    address indexed owner,
    Structs.Ticket ticket,
    uint256 tokenId,
    string tokenURI
  );

  event TransferTicket(address indexed sender, address indexed receiver, uint256 tokenId);

  event CreateBuyOffer(
    bytes32 offerId,
    address indexed buyer,
    bytes32 eventId,
    bytes32 ticketTypeId,
    uint256 price,
    uint256 deadline
  );

  event AcceptBuyOffer(
    bytes32 indexed offerId,
    address indexed buyer,
    address indexed seller,
    bytes32 eventId,
    bytes32 ticketTypeId,
    uint256 ticketId,
    string tokenURI,
    uint256 price
  );

  event CreateSellOffer(
    bytes32 indexed offerId,
    address indexed seller,
    bytes32 eventId,
    bytes32 ticketTypeId,
    uint256 ticketId,
    uint256 price
  );

  event AcceptSellOffer(
    bytes32 indexed offerId,
    address indexed buyer,
    address indexed seller,
    bytes32 eventId,
    bytes32 ticketTypeId,
    uint256 ticketId,
    string tokenURI,
    uint256 price
  );

  event CancelOffer(bytes32 indexed offerId, address indexed sender);

  event UseTicket(address indexed sender, uint256 ticketId);

  event BecomeOrganizer(address indexed account);

  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds;
  SouvenirGenerator private souvenirGenerator;
  TIK private token;

  mapping(bytes32 => Structs.Event) private events;

  uint256[] private ticketIds;
  mapping(uint256 => Structs.Ticket) private tickets;
  mapping(bytes32 => Structs.Offer) private offers;

  bytes32 public constant ORGANIZER_ROLE = keccak256('ORGANIZER_ROLE');
  bytes32 public constant OWNER_ROLE = keccak256('OWNER_ROLE');
  uint256 private balance = 0;
  uint256 private withdrawableBalance = 0;
  uint256 private organizerDeposit = 0.001 ether;

  modifier eventExists(bytes32 _eventId) {
    require(events[_eventId].id != 0, 'Event does not exist');
    _;
  }

  modifier ticketTypeExists(bytes32 _eventId, bytes32 _ticketTypeId) {
    require(events[_eventId].ticketTypes[_ticketTypeId].id != 0, 'Ticket type does not exist');
    _;
  }

  modifier ticketExists(uint256 _tokenId) {
    require(_exists(_tokenId), 'Ticket does not exist');
    _;
  }

  modifier onlyTicketOwner(uint256 _tokenId) {
    require(ownerOf(_tokenId) == msg.sender, 'Only ticket owner can call this function');
    _;
  }

  modifier offerExists(bytes32 _offerId) {
    require(offers[_offerId].id != 0, 'Offer does not exist');
    _;
  }

  constructor(
    address _tokenAddress,
    address _souvenirGeneratorAddress
  ) ERC721('Ticket NFT', 'NFT') {
    souvenirGenerator = SouvenirGenerator(_souvenirGeneratorAddress);
    token = TIK(_tokenAddress);
    _setupRole(OWNER_ROLE, msg.sender);
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
  }

  function setTIKContract(address _tokenAddress) external onlyRole(OWNER_ROLE) {
    token = TIK(_tokenAddress);
  }

  function setSouvenirGeneratorContract(
    address _souvenirGeneratorAddress
  ) external onlyRole(OWNER_ROLE) {
    souvenirGenerator = SouvenirGenerator(_souvenirGeneratorAddress);
  }

  function setOrganizerDeposit(uint256 _organizerDeposit) external onlyRole(OWNER_ROLE) {
    organizerDeposit = _organizerDeposit;
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC721, AccessControl) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  function createEvent(
    string memory _name,
    string memory _description,
    string memory eventStorage,
    string memory location,
    uint256 startTime,
    uint256 endTime
  ) external onlyRole(ORGANIZER_ROLE) {
    bytes32 _eventId = keccak256(abi.encode(_name));
    require(events[_eventId].id == 0, 'Event already exists');
    events[_eventId].id = _eventId;
    events[_eventId].organizer = msg.sender;
    events[_eventId].name = _name;
    events[_eventId].description = _description;
    events[_eventId].eventStorage = eventStorage;
    events[_eventId].location = location;
    events[_eventId].startTime = startTime;
    events[_eventId].endTime = endTime;
    emit CreateEvent(
      msg.sender,
      _eventId,
      _name,
      _description,
      eventStorage,
      location,
      startTime,
      endTime
    );
  }

  function updateEvent(
    bytes32 _eventId,
    string memory _name,
    string memory _description,
    string memory eventStorage,
    string memory location,
    uint256 startTime,
    uint256 endTime
  ) external eventExists(_eventId) onlyRole(ORGANIZER_ROLE) {
    require(events[_eventId].organizer == msg.sender, 'Only organizer can edit event');
    events[_eventId].name = _name;
    events[_eventId].description = _description;
    events[_eventId].eventStorage = eventStorage;
    events[_eventId].location = location;
    events[_eventId].startTime = startTime;
    events[_eventId].endTime = endTime;
    emit UpdateEvent(
      msg.sender,
      _eventId,
      _name,
      _description,
      eventStorage,
      location,
      startTime,
      endTime
    );
  }

  function deleteEvent(bytes32 _eventId) external eventExists(_eventId) onlyRole(ORGANIZER_ROLE) {
    require(events[_eventId].organizer == msg.sender, 'Only organizer can remove event');
    require(events[_eventId].ticketTypeIds.length == 0, 'Event still has ticket types');
    delete events[_eventId];
    emit DeleteEvent(msg.sender, _eventId);
  }

  function createTicketType(
    bytes32 _eventId,
    string memory _ticketName,
    string memory _tokenURI,
    string memory _souvenirTokenURI,
    uint256 _price,
    uint256 _maxSupply
  ) external eventExists(_eventId) onlyRole(ORGANIZER_ROLE) {
    bytes32 _ticketTypeId = keccak256(abi.encode(_eventId, _ticketName));
    require(
      events[_eventId].organizer == msg.sender,
      'Only the organizer of this event can create ticket type'
    );
    require(events[_eventId].ticketTypes[_ticketTypeId].id == 0, 'Ticket type already exists');
    Structs.TicketType memory ticketType = Structs.TicketType({
      id: _ticketTypeId,
      name: _ticketName,
      price: _price,
      maxSupply: _maxSupply,
      currentSupply: _maxSupply,
      tokenURI: _tokenURI,
      souvenirTokenURI: _souvenirTokenURI
    });
    events[_eventId].ticketTypes[_ticketTypeId] = ticketType;
    events[_eventId].indexOf[_ticketTypeId] = uint8(events[_eventId].ticketTypeIds.length);
    events[_eventId].ticketTypeIds.push(_ticketTypeId);
    emit CreateTicketType(msg.sender, _eventId, ticketType);
  }

  function updateTicketType(
    bytes32 _eventId,
    bytes32 _ticketTypeId,
    string memory _ticketName,
    string memory _tokenURI,
    string memory _souvenirTokenURI,
    uint256 _price,
    uint256 _maxSupply
  )
    external
    eventExists(_eventId)
    ticketTypeExists(_eventId, _ticketTypeId)
    onlyRole(ORGANIZER_ROLE)
  {
    require(events[_eventId].organizer == msg.sender, 'Only the organizer can edit ticket types');
    Structs.TicketType memory ticketType = Structs.TicketType({
      id: _ticketTypeId,
      name: _ticketName,
      price: _price,
      maxSupply: _maxSupply,
      currentSupply: _maxSupply,
      tokenURI: _tokenURI,
      souvenirTokenURI: _souvenirTokenURI
    });
    events[_eventId].ticketTypes[_ticketTypeId] = ticketType;
    emit UpdateTicketType(msg.sender, _eventId, ticketType);
  }

  function deleteTicketType(
    bytes32 _eventId,
    bytes32 _ticketTypeId
  )
    external
    eventExists(_eventId)
    ticketTypeExists(_eventId, _ticketTypeId)
    onlyRole(ORGANIZER_ROLE)
  {
    Structs.Event storage _event = events[_eventId];
    require(_event.organizer == msg.sender, 'Only the organizer can remove ticket types');
    delete _event.ticketTypes[_ticketTypeId];

    uint8 index = _event.indexOf[_ticketTypeId];
    uint8 lastIndex = uint8(_event.ticketTypeIds.length) - 1;
    bytes32 lastKey = _event.ticketTypeIds[lastIndex];

    _event.indexOf[lastKey] = index;
    delete _event.indexOf[_ticketTypeId];

    _event.ticketTypeIds[index] = lastKey;
    _event.ticketTypeIds.pop();
    emit DeleteTicketType(msg.sender, _eventId, _ticketTypeId);
  }

  function _mintNFT(address _recipient, string memory _tokenURI) private returns (uint256) {
    _tokenIds.increment();

    uint256 newItemId = _tokenIds.current();
    _mint(_recipient, newItemId);
    _setTokenURI(newItemId, _tokenURI);
    return newItemId;
  }

  function buyTicket(
    bytes32 _eventId,
    bytes32 _ticketTypeId,
    address _recipient,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s,
    uint256 amount
  ) external eventExists(_eventId) ticketTypeExists(_eventId, _ticketTypeId) {
    Structs.Event storage _event = events[_eventId]; // Stack too deep error workoaround
    Structs.TicketType storage ticketType = events[_eventId].ticketTypes[_ticketTypeId];
    require(ticketType.currentSupply > 0, 'Tickets from this type sold out');
    if (deadline != 0) {
      token.permit(msg.sender, address(this), amount, deadline, v, r, s);
    }
    require(
      token.allowance(msg.sender, address(this)) >= ticketType.price,
      'Token allowance too low'
    );
    bool success = token.transferFrom(msg.sender, _event.organizer, ticketType.price);
    require(success, 'transfer failed');
    ticketType.currentSupply--;
    uint256 tokenId = _mintNFT(_recipient, ticketType.tokenURI);
    Structs.Ticket memory ticket;
    ticket.id = tokenId;
    ticket.eventId = _event.id;
    ticket.ticketTypeId = _ticketTypeId;
    ticket.owner = _recipient;
    ticket.usable = true;
    ticket.souvenirMinted = false;
    ticket.used = false;
    tickets[tokenId] = ticket;
    ticketIds.push(tokenId);
    emit BuyTicket(
      msg.sender,
      _recipient,
      ticket.eventId, // Stack too deep error workoaround
      ticket.ticketTypeId, // Stack too deep error workoaround
      tokenId,
      ticketType.tokenURI
    );
  }

  function getSouvenir(
    uint256 _ticketId
  ) external ticketExists(_ticketId) onlyTicketOwner(_ticketId) {
    Structs.Ticket memory ticket = tickets[_ticketId];
    require(!ticket.souvenirMinted, 'Souvenir already minted');
    require(ticket.used, "Ticket still hasn't been used");
    uint256 souvenirId = souvenirGenerator.generateSouvenir(
      msg.sender,
      events[ticket.eventId].ticketTypes[ticket.ticketTypeId].souvenirTokenURI
    );
    ticket.souvenirMinted = true;
    ticket.souvenirId = souvenirId;
    tickets[_ticketId] = ticket;
    emit GenerateSouvenir(
      msg.sender,
      tickets[_ticketId],
      souvenirId,
      events[ticket.eventId].ticketTypes[ticket.ticketTypeId].souvenirTokenURI
    );
  }

  function deposit() public payable {
    token.mint(msg.sender, msg.value);
    balance += msg.value;
    emit Deposit(msg.sender, msg.value);
  }

  function becomeOrganizer() external {
    require(!hasRole(ORGANIZER_ROLE, msg.sender), 'Caller is already an organizer');
    require(
      token.balanceOf(msg.sender) >= organizerDeposit,
      'Not enough tokens to become organizer'
    );
    token.burn(msg.sender, organizerDeposit);
    _setupRole(ORGANIZER_ROLE, msg.sender);
    withdrawableBalance += organizerDeposit;
    emit BecomeOrganizer(msg.sender);
  }

  function ownerWithdraw() external onlyRole(OWNER_ROLE) {
    require(withdrawableBalance > 0, 'Not enough to be withdrawn');
    bool success = payable(msg.sender).send(withdrawableBalance);
    require(success, 'send failed');
    emit Withdraw(msg.sender, withdrawableBalance);
    withdrawableBalance = 0;
  }

  function userWithdraw(uint256 amount) external {
    uint256 userBalance = token.balanceOf(msg.sender);
    require(amount <= userBalance, 'Not enough to be withdrawn');
    require(amount <= balance, 'Withdraw is currently disabled');
    bool success = payable(msg.sender).send(amount);
    require(success, 'send failed');
    token.burn(msg.sender, amount);
    emit Withdraw(msg.sender, amount);
    balance -= amount;
  }

  function transferTicket(address _sender, address _recipient, uint256 _tokenId) private {
    _transfer(_sender, _recipient, _tokenId);
    tickets[_tokenId].owner = _recipient;
    emit TransferTicket(_sender, _recipient, _tokenId);
  }

  function createBuyOffer(
    bytes32 eventId,
    bytes32 ticketTypeId,
    uint256 price,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external eventExists(eventId) ticketTypeExists(eventId, ticketTypeId) {
    bytes32 id = keccak256(abi.encode(msg.sender, eventId, ticketTypeId, v, r, s));
    token.permit(msg.sender, address(this), price, deadline, v, r, s);
    Structs.Offer memory offer;
    offer.id = id;
    offer.buyer = msg.sender;
    offer.eventId = eventId;
    offer.ticketTypeId = ticketTypeId;
    offer.price = price;
    offer.deadline = deadline;
    offer.buyOffer = true;
    offer.sellOffer = false;
    offers[id] = offer;
    emit CreateBuyOffer(id, msg.sender, eventId, ticketTypeId, price, deadline);
  }

  function acceptBuyOffer(bytes32 id, uint256 ticketId) external offerExists(id) {
    Structs.Offer storage offer = offers[id];
    require(offer.buyer != msg.sender, 'Cannot buy your own ticket');
    require(token.allowance(offer.buyer, address(this)) >= offer.price, 'Token allowance too low');
    offer.ticketId = ticketId;
    bool success = token.transferFrom(offer.buyer, msg.sender, offer.price);
    require(success, 'transfer failed');
    transferTicket(msg.sender, offer.buyer, offer.ticketId);
    offer.accepted = true;
    offer.seller = msg.sender;
    tickets[offer.ticketId].owner = offer.buyer;
    tickets[offer.ticketId].usable = true;
    emit AcceptBuyOffer(
      id,
      offer.buyer,
      msg.sender,
      offer.eventId,
      offer.ticketTypeId,
      offer.ticketId,
      events[offer.eventId].ticketTypes[offer.ticketTypeId].tokenURI,
      offer.price
    );
    delete offers[id];
  }

  function createSellOffer(
    bytes32 eventId,
    bytes32 ticketTypeId,
    uint256 ticketId,
    uint256 price
  )
    external
    eventExists(eventId)
    ticketTypeExists(eventId, ticketTypeId)
    ticketExists(ticketId)
    onlyTicketOwner(ticketId)
  {
    bytes32 id = keccak256(abi.encode(msg.sender, eventId, ticketTypeId, ticketId));
    require(!offers[id].sellOffer, 'Sell offer already exists for this ticket');
    Structs.Offer memory offer;
    offer.id = id;
    offer.seller = msg.sender;
    offer.eventId = eventId;
    offer.ticketTypeId = ticketTypeId;
    offer.ticketId = ticketId;
    offer.price = price;
    offer.deadline = 0;
    offer.buyOffer = false;
    offer.sellOffer = true;
    offers[id] = offer;
    tickets[ticketId].usable = false;
    emit CreateSellOffer(id, msg.sender, eventId, ticketTypeId, ticketId, price);
  }

  function acceptSellOffer(
    bytes32 id,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external offerExists(id) {
    Structs.Offer storage offer = offers[id];
    require(offer.seller != msg.sender, 'Cannot buy your own ticket');
    token.permit(msg.sender, address(this), offer.price, deadline, v, r, s);

    require(token.allowance(msg.sender, address(this)) >= offer.price, 'Token allowance too low');
    bool success = token.transferFrom(msg.sender, offer.seller, offer.price);
    require(success, 'transfer failed');
    transferTicket(offer.seller, msg.sender, offer.ticketId);
    offer.accepted = true;
    offer.buyer = msg.sender;
    tickets[offer.ticketId].usable = true;
    tickets[offer.ticketId].owner = offer.buyer;
    emit AcceptSellOffer(
      id,
      offer.seller,
      msg.sender,
      offer.eventId,
      offer.ticketTypeId,
      offer.ticketId,
      events[offer.eventId].ticketTypes[offer.ticketTypeId].tokenURI,
      offer.price
    );
    delete offers[id];
  }

  function cancelOffer(bytes32 id) external offerExists(id) {
    Structs.Offer storage offer = offers[id];
    require(
      (offer.buyer == msg.sender && offer.buyOffer == true) ||
        (offer.seller == msg.sender && offer.sellOffer == true),
      'Not the creator of the offer'
    );
    tickets[offers[id].ticketId].usable = true;
    delete offers[id];
    emit CancelOffer(id, msg.sender);
  }

  function useTicket(uint256 _ticketId) external ticketExists(_ticketId) onlyRole(ORGANIZER_ROLE) {
    require(!tickets[_ticketId].used, 'Ticket is already used');
    require(events[tickets[_ticketId].eventId].organizer == msg.sender, 'Not the organizer');
    if (events[tickets[_ticketId].eventId].endTime != 0) {
      require(
        block.timestamp < events[tickets[_ticketId].eventId].endTime / 1000,
        'Event has ended'
      );
    }
    require(
      block.timestamp >= events[tickets[_ticketId].eventId].startTime / 1000,
      'Event has not started'
    );
    tickets[_ticketId].usable = false;
    tickets[_ticketId].used = true;
    emit UseTicket(msg.sender, _ticketId);
  }
}
