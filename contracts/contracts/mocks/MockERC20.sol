// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockERC20
/// @notice TEST-ONLY stand-in for the CHU token (Level 02) — a plain
///         mintable ERC-20 with no cap/access-control, used exclusively by
///         the Obra/ObraMarket test suites so they don't depend on the
///         staking-protocol repo. Never deployed as part of the protocol.
contract MockERC20 is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
