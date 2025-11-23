# Reference Files

This directory contains reference files that are **not deployed** to NetSuite but are kept for documentation purposes.

## Objects/

Contains custom object definitions (custom records and custom lists) that were previously deployed to NetSuite or deployed manually. These files are kept here for:
- Documentation of the data structure
- Version control tracking
- Reference when modifying scripts
- Future deployments to other environments

**Note:** These objects are excluded from deployment by being outside the `src/` directory. If you need to deploy them to a new NetSuite environment, you can temporarily move them back into `src/Objects/` or deploy them manually through the NetSuite UI.
