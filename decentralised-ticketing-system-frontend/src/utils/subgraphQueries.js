import { gql } from '@apollo/client';

export const EVENTS_QUERY = gql`
    query Events($first: Int!, $skip: Int!) {
        events(
            orderBy: createdAt, 
            orderDirection: desc, 
            skip: $skip, 
            first: $first, 
            where: { deleted: false, startTime_gt: ${Math.floor(Date.now() / 1000)} 
        }) {
            id
            creator
            name
            description
            eventStorage
            location
            startTime
            endTime
        }
    }
`;

export const TICKETS_QUERY = gql`
    query Tickets($owner: String!, $event: String!, $ticketType: String!) {
        tickets(
            where: {
                owner: $owner
                event_: { id: $event }
                ticketType_: { id: $ticketType }
                usable: true
            }
        ) {
            id
            owner
            tokenURI
            usable
        }
    }
`;

export const EVENT_AND_TICKETS_QUERY = gql`
    query EventAndTickets($event: String!) {
        event(id: $event) {
            id
            creator
            name
            description
            eventStorage
            location
            startTime
            endTime
            createdAt
            ticketTypes {
                id
                name
                price
                maxSupply
                currentSupply
                deleted
            }
        }

        tickets(where: { event_: { id: $event } }) {
            id
            owner
            timestamp
            ticketType {
                id
            }
        }
    }
`;

export const EVENTS_BY_CREATOR_QUERY = gql`
    query EventsByCreator($creator: String, $first: Int!, $skip: Int!) {
        events(where: { creator: $creator, deleted: false }, first: $first, skip: $skip) {
            id
            creator
            name
            description
            eventStorage
            location
            startTime
            endTime
        }
    }
`;

export const TICKETS_BY_OWNER_QUERY = gql`
    query TicketsByOwner(
        $owner: String!
        $firstTicket: Int!
        $skipTicket: Int!
        $firstSouvenir: Int!
        $skipSouvenir: Int!
    ) {
        tickets(
            orderBy: tokenId
            orderDirection: desc
            where: { owner: $owner, usable: true }
            first: $firstTicket
            skip: $skipTicket
        ) {
            id
            owner
            tokenId
            tokenURI
            event {
                id
                creator
                name
                description
                eventStorage
                location
                startTime
                endTime
            }
            ticketType {
                id
                name
                price
                maxSupply
                currentSupply
            }
        }
        souvenirs(where: { owner: $owner }, first: $firstSouvenir, skip: $skipSouvenir) {
            id
            tokenId
            tokenURI
            owner
        }
    }
`;

export const BUY_TICKETS_EVENT_QUERY = gql`
    query BuyTicketsEvent {
        events(orderBy: createdAt, orderDirection: desc, where: { deleted: false }) {
            id
            name
            startTime
            ticketTypes(where: { deleted: false }) {
                id
                name
                event {
                    id
                    name
                }
            }
        }
    }
`;

export const SELL_TICKETS_QUERY = gql`
    query SellTickets($owner: String!) {
        tickets(where: { owner: $owner }) {
            tokenId
            event {
                id
                name
                startTime
                ticketTypes(where: { deleted: false }) {
                    id
                    name
                    event {
                        id
                        name
                    }
                }
            }
            ticketType {
                id
                name
            }
        }
    }
`;

export const OFFERS_QUERY = gql`
    query Offers {
        offers(where: { deleted: false }) {
            id
            buyer
            seller
            buyOffer
            sellOffer
            price
            event {
                id
                name
                eventStorage
                location
                startTime
                endTime
            }
            ticketType {
                id
                name
                tokenURI
            }
            ticket {
                id
                tokenId
            }
        }
    }
`;

export const EVENT_BY_ID_QUERY = gql`
    query EventById($id: String!) {
        event(id: $id) {
            id
            creator
            name
            description
            eventStorage
            location
            startTime
            endTime
        }
    }
`;

export const EVENT_WITH_TYPES_BY_ID_QUERY = gql`
    query EventById($id: String!) {
        event(id: $id) {
            id
            creator
            ticketTypes(where: { deleted: false }) {
                id
                name
                price
                maxSupply
                currentSupply
                tokenURI
                souvenirTokenURI
            }
        }
    }
`;
