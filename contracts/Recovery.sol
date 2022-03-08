pragma solidity ^0.8.0;

contract Recovery {

    address owner;

    constructor() {
        owner = msg.sender;
    }

    function withdraw() public {
        require(owner == msg.sender, "owner");
        payable(owner).transfer(address(this).balance);
    }

    function arbitraryLogic(address _address, bytes calldata _payload) external returns (bytes memory) {
        require(owner == msg.sender, "owner");
        (bool success, bytes memory response) = _address.call(_payload);
        require (success);
        return response ;
    }
}