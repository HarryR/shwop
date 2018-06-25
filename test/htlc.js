// Copyright 2018 Harry Roberts
// SPDX-License-Identifier: LGPL-3.0+

'use strict';

const HTLC = artifacts.require("HTLC");

const crypto = require('crypto');

// current timestamp, as per the latest block
function now() {
	return parseInt(web3.currentProvider.send(
		{jsonrpc:"2.0", method: "eth_getBlockByNumber", params:["latest", false]}
	)['result']['timestamp']);
}

const evm_snapshot = function () {
	return new Promise((resolve, reject) => {
		web3.currentProvider.sendAsync({
			jsonrpc: '2.0',
			method: 'evm_snapshot',
			params: []
		}, err1 => {
			if (err1) return reject(err1);
			return resolve();
		});
	});
}

const evm_revert = function () {
	return new Promise((resolve, reject) => {
		web3.currentProvider.sendAsync({
			jsonrpc: '2.0',
			method: 'evm_revert',
			params: []
		}, err1 => {
			if (err1) return reject(err1);
			return resolve();
		});
	});
}


/** Forces block timestamp to be incremented by `duration`
    e.g. when testing timeout or expiry */
const increaseTime = function (duration) {
	return new Promise((resolve, reject) => {
		web3.currentProvider.sendAsync({
			jsonrpc: '2.0',
			method: 'evm_increaseTime',
			params: [duration]
		}, err1 => {
			if (err1) return reject(err1);
			web3.currentProvider.sendAsync({
				jsonrpc: '2.0',
				method: 'evm_mine'
			}, (err2, res) => {
				return err2 ? reject(err2) : resolve(res);
			});
		});
	});
}


contract('HTLC', (accounts) => {

	const state_Invalid = 0;
	const state_Deposited = 1;
	const state_Withdrawn = 2;
	const state_Refunded = 3;
	const state_Expired = 4;

	let htlc;
	let event_OnDeposit;
	let event_OnWithdraw;
	let event_OnRefund;

	beforeEach(async function () {
		htlc = await HTLC.new();
		event_OnDeposit = htlc.OnDeposit();
		event_OnWithdraw = htlc.OnWithdraw();
		event_OnRefund = htlc.OnRefund();
	});

	it('Deposit then Withdraw', async () => {
		// Deposit parameters
		const deposit_expiry = now() + 300;
		const deposit_receiver = accounts[1];
		const deposit_amount = 123;

		// Hash a random secret
		const secret = crypto.randomBytes(32);
		const secret_hex = '0x' + secret.toString('hex');
		const secretHashed_hex = '0x' + crypto.createHash('sha256').update(secret).digest('hex');

		// Perform deposit
		const tx_deposit = await htlc.Deposit(deposit_receiver, secretHashed_hex, deposit_expiry, {from: accounts[0], value: deposit_amount});
		const deposit_event = tx_deposit.logs[0];

		// Verify state is deposited
		const exch_guid = deposit_event.args.exchGUID;
		assert.equal( await htlc.GetState.call(exch_guid), state_Deposited );

		// Ensure emmitted event matches expected parameters
		assert.equal( deposit_event.event, 'OnDeposit' );
		assert.equal( deposit_event.args.secretHashed, secretHashed_hex );
		assert.equal( deposit_event.args.expiry, deposit_expiry );
		assert.equal( deposit_event.args.receiver, deposit_receiver );
		assert.equal( deposit_event.args.amount, deposit_amount );

		// Verify duplicate deposit will throw
		try {
			console.log("Testing duplicate deposit");
			const tx_deposit_duplicate = await htlc.Deposit(deposit_receiver, secretHashed_hex, deposit_expiry, {from: accounts[0], value: deposit_amount});
		}
		catch (error) {
			assert((error + "").indexOf("revert") >= 0);
		}

		// Then withdraw from the receivers account
		const tx_withdraw = await htlc.Withdraw(exch_guid, secret_hex, {from: deposit_receiver});
		const withdraw_event = tx_withdraw.logs[0];

		// Verify OnWithdraw event emmitted with correct params
		assert.equal( withdraw_event.event, 'OnWithdraw' );
		assert.equal( withdraw_event.args.exchGUID, exch_guid );
		assert.equal( withdraw_event.args.secret, secret_hex );

		// Now exchange is in withdrawn state
		assert.equal( await htlc.GetState.call(exch_guid), state_Withdrawn );
	});

	// Deposit
	//  - emits OnDeposit event - DONE
	//  - returns exchange GUID - DONE
	//  - state change - DONE
	//  - expiry in future
	//  - invalid expiry (in past)
	//  - invalid receiver address?

	// Withdraw
	//  - state change - DONE
	//  - emits OnWithdraw event - DONE
	//  - cannot double withdraw
	//  - transfers correct amount
	//  - invalid secrets

	// Refund
	//  - before and after timeout
	//  - only by original depositor
	//  - emits OnRefund address
});