const HTLC = artifacts.require("HTLC");

module.exports = async (deployer) => {
    deployer.deploy(HTLC);
};
